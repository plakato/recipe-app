// Recipe extraction via OpenRouter (OpenAI-compatible chat completions API).
// Free models only — configured through .env (OPENROUTER_MODEL / _FALLBACK).
// Used by all AI import methods (URL, photo, voice) to produce a RecipeDraft.
//
// This module is server-only: it reads OPENROUTER_API_KEY and must never be
// imported into a client component.

import type { RecipeDraft } from "@/lib/recipes";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// A content part can be plain text or an image (for photo import in Phase 3).
type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type ChatMessage = {
  role: "system" | "user";
  content: string | ContentPart[];
};

const SYSTEM_PROMPT = `You extract a single cooking recipe from the material the user provides and return it as JSON.

Return ONLY a JSON object (no markdown, no commentary) with exactly these keys:
{
  "title": string,
  "description": string,        // one short sentence, or ""
  "ingredients": string[],      // each item its own string, e.g. "2 cups flour"
  "instructions": string[],     // each step its own string, in order
  "servings": string,           // e.g. "4" or "4 servings", or ""
  "prepTime": string,           // e.g. "20 min", or ""
  "cookTime": string            // e.g. "45 min", or ""
}

Rules:
- Keep the recipe in its ORIGINAL language (do not translate).
- ingredients and instructions must be arrays of strings, never one big block.
- Keep instruction steps concise but complete.
- If a field is unknown, use "" (or [] for the arrays). Never invent quantities.
- If the material is clearly NOT a recipe, return {"title":"","ingredients":[],"instructions":[]}.`;

// Variant used when a source (a photo page, a "5 desserts" article, a video
// description) may hold several recipes. Each recipe uses the same shape.
const MULTI_SYSTEM_PROMPT = SYSTEM_PROMPT.replace(
  "You extract a single cooking recipe from the material the user provides and return it as JSON.",
  "You extract every complete cooking recipe from the material the user provides and return them as JSON.",
)
  .replace(
    "Return ONLY a JSON object (no markdown, no commentary) with exactly these keys:\n{",
    'Return ONLY a JSON object (no markdown, no commentary) of the form {"recipes": [ ... ]}, where each recipe has exactly these keys:\n{',
  )
  .replace(
    "- If the material is clearly NOT a recipe, return {\"title\":\"\",\"ingredients\":[],\"instructions\":[]}.",
    "- Include a recipe only if the material gives its ingredients or method; skip mere mentions, links or names of dishes.\n- A source with one recipe returns one item. Never split one recipe into several.\n- If the material has no recipe, return {\"recipes\":[]}.",
  );

// Pull the first balanced JSON object out of a model response that may be
// wrapped in ```json fences or surrounded by stray prose.
export function extractJsonObject(raw: string): unknown {
  const text = raw.trim();
  // Strip a ```json ... ``` (or plain ```) fence if present.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model response.");
  }
  return JSON.parse(body.slice(start, end + 1));
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function toDraft(parsed: unknown): RecipeDraft {
  const obj = (parsed ?? {}) as Record<string, unknown>;
  return {
    title: asString(obj.title),
    description: asString(obj.description) || undefined,
    ingredients: asStringArray(obj.ingredients),
    instructions: asStringArray(obj.instructions),
    servings: asString(obj.servings) || undefined,
    prepTime: asString(obj.prepTime) || undefined,
    cookTime: asString(obj.cookTime) || undefined,
  };
}

// Parse the {"recipes":[...]} shape (tolerating a bare single recipe object).
export function toDrafts(parsed: unknown): RecipeDraft[] {
  const obj = (parsed ?? {}) as Record<string, unknown>;
  const list = Array.isArray(obj.recipes) ? obj.recipes : [parsed];
  return list
    .map(toDraft)
    .filter((d) => d.title || d.ingredients.length > 0);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Call one model. Retries on 429 (free-tier rate limit) and 503 with a short
// backoff, since free models are frequently busy. Throws on other errors.
async function callModel(model: string, messages: ChatMessage[]): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is not set in .env");
  }

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // Optional attribution headers OpenRouter recommends.
        "HTTP-Referer": "http://localhost",
        "X-Title": "Family Recipes",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        // Ask for a JSON object where supported; harmless where ignored.
        response_format: { type: "json_object" },
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
      // Free models sometimes return an empty completion — retry before failing.
      if (attempt < maxAttempts) {
        await sleep(attempt * 3000);
        continue;
      }
      throw new Error(`Empty response from ${model}`);
    }

    // Retry rate-limit / temporary-unavailable before giving up on this model.
    if ((res.status === 429 || res.status === 503) && attempt < maxAttempts) {
      await sleep(attempt * 4000);
      continue;
    }

    const detail = await res.text().catch(() => "");
    throw new Error(`OpenRouter ${res.status} for ${model}: ${detail.slice(0, 300)}`);
  }

  throw new Error(`OpenRouter kept rate-limiting ${model}.`);
}

// Try the (optional) override model first, then the primary free model, then
// the fallback, then surface the error. The override lets callers opt into a
// stronger paid model (e.g. for handwriting) while still degrading to free.
async function runExtraction(
  messages: ChatMessage[],
  modelOverride?: string,
): Promise<RecipeDraft> {
  const [draft] = await runModels(
    messages,
    (parsed) => {
      const d = toDraft(parsed);
      return d.title || d.ingredients.length > 0 ? [d] : [];
    },
    modelOverride,
  );
  return draft;
}

// Shared model loop: try each model in turn, parse its answer with `parse`,
// and return the first non-empty result.
async function runModels(
  messages: ChatMessage[],
  parse: (parsed: unknown) => RecipeDraft[],
  modelOverride?: string,
): Promise<RecipeDraft[]> {
  const primary = process.env.OPENROUTER_MODEL ?? "google/gemma-4-31b-it:free";
  const fallback = process.env.OPENROUTER_MODEL_FALLBACK;
  const models = [
    ...new Set(
      [modelOverride, primary, fallback].filter(Boolean) as string[],
    ),
  ];

  const errors: unknown[] = [];
  for (const model of models) {
    try {
      const content = await callModel(model, messages);
      const drafts = parse(extractJsonObject(content));
      if (drafts.length === 0) {
        throw new Error("Model did not find a recipe in the material.");
      }
      return drafts;
    } catch (err) {
      errors.push(err);
      // Try the next model in the list.
    }
  }
  // Prefer a substantive error (e.g. "no recipe found") over a later model's
  // rate-limit noise, so the user sees why the material was rejected.
  const isBusy = (e: unknown) =>
    e instanceof Error && /OpenRouter (429|503|404)|rate-limit/i.test(e.message);
  const best = errors.find((e) => !isBusy(e)) ?? errors[errors.length - 1];
  throw best instanceof Error ? best : new Error("Recipe extraction failed.");
}

// A hint telling the model what language the recipe is in improves accuracy,
// especially for handwriting. e.g. "Slovak", "Czech".
function languageLine(languageHint?: string): string {
  return languageHint
    ? ` The recipe is written in ${languageHint}; read it carefully in that language.`
    : "";
}

// Extract a recipe from plain text (used by URL and voice import).
export function extractRecipeFromText(
  source: string,
  languageHint?: string,
  modelOverride?: string,
): Promise<RecipeDraft> {
  return runExtraction(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract the recipe from the following material.${languageLine(
          languageHint,
        )}\n\n${source}`,
      },
    ],
    modelOverride,
  );
}

// Extract a recipe from an image (used by photo import in Phase 3).
// imageDataUrl is a data: URL (e.g. "data:image/jpeg;base64,....").
export function extractRecipeFromImage(
  imageDataUrl: string,
  languageHint?: string,
  modelOverride?: string,
): Promise<RecipeDraft> {
  return runExtraction(
    [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract the recipe shown in this image.${languageLine(
              languageHint,
            )} Transcribe printed or handwritten text as accurately as you can.`,
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    modelOverride,
  );
}

// Same as extractRecipeFromText, but returns every recipe found in the
// material (bulk import of pages/videos that bundle several recipes).
export function extractRecipesFromText(
  source: string,
  languageHint?: string,
  modelOverride?: string,
): Promise<RecipeDraft[]> {
  return runModels(
    [
      { role: "system", content: MULTI_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract every recipe from the following material.${languageLine(
          languageHint,
        )}\n\n${source}`,
      },
    ],
    toDrafts,
    modelOverride,
  );
}

// Same as extractRecipeFromImage, but returns every recipe on the photo
// (e.g. two recipes written on one notebook page).
export function extractRecipesFromImage(
  imageDataUrl: string,
  languageHint?: string,
  modelOverride?: string,
): Promise<RecipeDraft[]> {
  return runModels(
    [
      { role: "system", content: MULTI_SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Extract every recipe shown in this image.${languageLine(
              languageHint,
            )} Transcribe printed or handwritten text as accurately as you can.`,
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    toDrafts,
    modelOverride,
  );
}
