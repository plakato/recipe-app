// Recipe extraction via OpenRouter (OpenAI-compatible chat completions API).
// Free models only — configured through .env (OPENROUTER_MODEL / _FALLBACK).
// Used by all AI import methods (URL, photo, voice) to produce a RecipeDraft.
//
// This module is server-only: it reads OPENROUTER_API_KEY and must never be
// imported into a client component.

import type { RecipeDraft } from "@/lib/recipes";
import { paidBudgetLeft, recordModelCall } from "@/lib/aiBudget";
import { withUsage } from "@/lib/usageContext";
import { AppError } from "@/lib/userErrors";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// A content part can be plain text or an image (for photo import in Phase 3).
type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "high" } };

export type ChatMessage = {
  role: "system" | "user";
  content: string | ContentPart[];
};

const SYSTEM_PROMPT = `You extract a single cooking recipe from the material the user provides and return it as JSON.

Return ONLY a JSON object (no markdown, no commentary) with exactly these keys:
{
  "title": string,
  "ingredients": string[],      // each item its own string, e.g. "2 cups flour"
  "instructions": string[]      // each step its own string, in order
}

Rules:
- Keep the recipe in its ORIGINAL language (do not translate).
- ingredients and instructions must be arrays of strings, never one big block.
- If the recipe has separate components (e.g. dough, filling, glaze, sauce), keep ONE list but put a heading line ending in a colon before each component's items, in the recipe's language, e.g. "Cesto:", "Plnka:", "Poleva:". Do the same in instructions when the steps are grouped by component. Never invent components that the source doesn't have.
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
    ingredients: asStringArray(obj.ingredients),
    instructions: asStringArray(obj.instructions),
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

// The free models, in the order to try them.
function freeModels(): string[] {
  return [
    process.env.OPENROUTER_MODEL ?? "google/gemma-4-31b-it:free",
    process.env.OPENROUTER_MODEL_FALLBACK,
  ].filter(Boolean) as string[];
}

// The paid model (OPENROUTER_MODEL_HQ), used only when all the free models
// are busy — unless it is already in the list (e.g. passed as an override).
function paidFallback(tried: string[]): string | undefined {
  const hq = process.env.OPENROUTER_MODEL_HQ;
  return hq && !tried.includes(hq) ? hq : undefined;
}

// Errors that mean "try again later" rather than "this failed".
function isBusy(e: unknown): boolean {
  return (
    e instanceof Error &&
    /OpenRouter (429|502|503|404)|rate-limit|Empty response/i.test(e.message)
  );
}

// Call one model. Retries on 429 (free-tier rate limit) and 503 with a short
// backoff, since free models are frequently busy. Throws on other errors.
// A JSON schema for the answer ("structured output"): models that support it
// can only return valid JSON of that shape. Others get plain JSON mode.
type JsonSchema = { name: string; schema: Record<string, unknown> };

async function callModel(
  model: string,
  messages: ChatMessage[],
  schema?: JsonSchema,
): Promise<string> {
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
        // A recipe answer needs a few thousand tokens. The cap stops a model
        // stuck repeating itself (one ran to 65k tokens, $0.16, on 2026-10-08).
        max_tokens: 8000,
        // Ask for a JSON object where supported; harmless where ignored.
        response_format: schema
          ? { type: "json_schema", json_schema: { ...schema, strict: true } }
          : { type: "json_object" },
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
        usage?: {
          cost?: number;
          prompt_tokens?: number;
          completion_tokens?: number;
          completion_tokens_details?: { reasoning_tokens?: number };
        };
      };
      if (data.choices?.[0]?.finish_reason === "length") {
        const tail = (data.choices[0].message?.content ?? "").slice(-300);
        console.warn(
          `${model} hit the length cap (${data.usage?.completion_tokens_details?.reasoning_tokens ?? "?"} reasoning tokens). Answer ends: ${tail}`,
        );
      }
      // Every call is recorded (statistics; paid ones also count against the
      // budget). Free models cost nothing; if a paid call's cost is missing,
      // assume a cent rather than nothing.
      await recordModelCall({
        model,
        costUsd: data.usage?.cost ?? (model.endsWith(":free") ? 0 : 0.01),
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
      });
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
// and return the first non-empty result. Calls are recorded as "read-recipe".
function runModels<T = RecipeDraft>(
  messages: ChatMessage[],
  parse: (parsed: unknown) => T[],
  modelOverride?: string,
  schema?: JsonSchema,
): Promise<T[]> {
  return withUsage({ purpose: "read-recipe" }, () =>
    tryModels(messages, parse, modelOverride, schema),
  );
}

async function tryModels<T>(
  messages: ChatMessage[],
  parse: (parsed: unknown) => T[],
  modelOverride?: string,
  schema?: JsonSchema,
): Promise<T[]> {
  const models = [...new Set([modelOverride, ...freeModels()].filter(Boolean) as string[])];
  const paid = paidFallback(models);

  const errors: unknown[] = [];
  for (const model of [...models, ...(paid ? [paid] : [])]) {
    // The paid model is a last resort: only when every free model was busy
    // (never to second-guess a free model that found no recipe), and only
    // while the monthly/daily budget lasts.
    if (model === paid && !(errors.every(isBusy) && (await paidBudgetLeft()))) break;
    if (model === paid) console.warn(`Free models busy; reading the recipe with paid ${paid}.`);
    try {
      const content = await callModel(model, messages, schema);
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
  // Tell the person why, kindly: every model busy, or no recipe in the
  // material (a substantive answer beats a later model's rate-limit noise).
  const detail = errors.map((e) => (e instanceof Error ? e.message : String(e))).join(" | ");
  if (errors.every(isBusy)) throw new AppError("busy", detail);
  const best = errors.find((e) => !isBusy(e));
  if (best instanceof Error && /did not find a recipe/i.test(best.message)) {
    throw new AppError("no-recipe", detail);
  }
  throw new AppError("unknown", detail);
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
            )} Transcribe printed or handwritten text as accurately as you can. Ignore any crossed-out or struck-through words: the author deleted them, so leave them out and do not guess a replacement.`,
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
            )} Transcribe printed or handwritten text as accurately as you can. Ignore any crossed-out or struck-through words: the author deleted them, so leave them out and do not guess a replacement.`,
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
    toDrafts,
    modelOverride,
  );
}

// Ask the free models (the paid one only if all are busy, within the budget)
// for a JSON answer; `parse` returns null for an unusable one, which moves on
// to the next model. Returns null if no model gave a usable answer.
export async function askModelsForJson<T>(
  messages: ChatMessage[],
  parse: (parsed: unknown) => T | null,
): Promise<T | null> {
  const models = freeModels();
  const paid = paidFallback(models);
  const errors: unknown[] = [];
  for (const model of [...models, ...(paid ? [paid] : [])]) {
    if (model === paid && !(errors.every(isBusy) && (await paidBudgetLeft()))) break;
    try {
      const result = parse(extractJsonObject(await callModel(model, messages)));
      if (result !== null) return result;
      errors.push(new Error(`Unusable answer from ${model}`));
    } catch (err) {
      errors.push(err);
    }
  }
  return null;
}

// Read the model's {"photos": [n, ...]} answer: one 1-based image number per
// recipe, 0 for "no photo of this one". Returns 0-based indexes (-1 for none),
// or null when the answer is unusable.
export function parseImageChoices(
  content: string,
  recipeCount: number,
  imageCount: number,
): number[] | null {
  let photos: unknown;
  try {
    photos = (extractJsonObject(content) as Record<string, unknown>).photos;
  } catch {
    return null;
  }
  if (!Array.isArray(photos) || photos.length !== recipeCount) return null;
  const picks = photos.map((p) => (typeof p === "string" ? Number(p) : p));
  if (!picks.every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= imageCount)) {
    return null;
  }
  return (picks as number[]).map((n) => n - 1);
}

// Ask a vision model which of the candidate photos (data: URLs, in page order)
// shows each recipe. One request for the whole page, however many recipes it
// has. Returns an index per recipe (-1 = none shows it), or null if no model
// gave a usable answer.
export function chooseRecipeImages(
  dishes: string[],
  imageDataUrls: string[],
): Promise<number[] | null> {
  return withUsage({ purpose: "choose-photos" }, () => askForImages(dishes, imageDataUrls));
}

async function askForImages(dishes: string[], imageDataUrls: string[]): Promise<number[] | null> {
  if (imageDataUrls.length === 0) return dishes.map(() => -1);
  const list = dishes.map((d, i) => `${i + 1}. ${d}`).join("\n");
  const content: ContentPart[] = [
    {
      type: "text",
      text:
        `These ${imageDataUrls.length} images come from a web page with ${
          dishes.length === 1 ? "this recipe" : `these ${dishes.length} recipes`
        }:\n${list}\n\n` +
        "For each recipe, pick the image that best shows that finished dish; if none does, the one showing it being made or its main ingredients. " +
        "Several recipes may share one image when the page has a single photo for all of them. " +
        "Never pick photos of people, logos, ads, text or graphics, or a clearly different dish. " +
        `Answer with JSON only: {"photos": [one image number per recipe, in recipe order]}, using 0 for a recipe that no image shows. ` +
        `It must list exactly ${dishes.length} number${dishes.length === 1 ? "" : "s"}.`,
    },
  ];
  imageDataUrls.forEach((url, i) => {
    content.push({ type: "text", text: `Image ${i + 1}:` });
    content.push({ type: "image_url", image_url: { url } });
  });

  const models = freeModels();
  const paid = paidFallback(models);
  const errors: unknown[] = [];
  for (const model of [...models, ...(paid ? [paid] : [])]) {
    // Paid model only if every free model was busy (not if one just answered badly).
    if (model === paid && !(errors.every(isBusy) && (await paidBudgetLeft()))) break;
    if (model === paid) console.warn(`Free models busy; choosing photos with paid ${paid}.`);
    try {
      const answer = await callModel(model, [{ role: "user", content }]);
      const picks = parseImageChoices(answer, dishes.length, imageDataUrls.length);
      if (picks) return picks;
      errors.push(new Error(`Unusable answer from ${model}`));
    } catch (err) {
      errors.push(err);
    }
  }
  return null;
}

// ---- Photo import: one or more photos taken together (roadmap step 5) ----

// [ymin, xmin, ymax, xmax] on a 0–1000 scale of the photo it is on.
export type Box = [number, number, number, number];

export type PageRecipe = RecipeDraft & {
  // 0-based indexes of the photos holding this recipe's text.
  photos: number[];
  // Where the recipe's dish is pictured, for cropping (null: nowhere).
  dish: { photo: number; box: Box } | null;
};

const PAGES_SYSTEM_PROMPT = `You read cooking recipes from photos that a person took together to save them: magazine or cookbook pages, handwritten cards or notes. One recipe may continue over several photos (e.g. two pages), one photo may hold several recipes, and some photos only show a picture of a dish.

Return ONLY a JSON object (no markdown, no commentary):
{"pictures": number[],           // photos that are mainly a picture of a dish, with little or no recipe text
 "recipes": [
  {
    "title": string,
    "ingredients": string[],     // each item its own string, e.g. "2 cups flour"
    "instructions": string[],    // each step its own string, in order
    "tips": string[],            // practical tips for this recipe; [] if none
    "photos": number[],          // the photo numbers holding this recipe's text
    "dish": {"photo": number, "box": [ymin, xmin, ymax, xmax]} | null
  }
]}

Which recipes:
- A recipe that continues on another photo is ONE recipe: join its parts in order.
- Include a recipe only if its ingredients or method can be read. Skip recipes cut off at the edge of the photo or only partly visible, and mere mentions or names of dishes.
- Return every recipe; for each, say in "dish" where its dish is pictured — a full-page picture of the dish (matched by its caption) is the best choice.

Text:
- Keep the recipe in its ORIGINAL language (do not translate). Transcribe printed or handwritten text as accurately as you can.
- Join words that the page splits at the end of a line (e.g. "mari-" + "nády" → "marinády"), and lines that continue one ingredient (e.g. "1–2 lžičky srirachy" + "+ navíc k podávání" is one item).
- If the recipe has separate components (e.g. dough, filling, glaze, sauce, "for serving"), keep ONE list but put a heading line ending in a colon before each component's items, in the recipe's language, e.g. "Cesto:", "Plnka:", "K podávání:". Do the same in instructions when the steps are grouped by component. Never invent components.
- Leave out everything that is not the recipe itself: introductions, stories and history of the dish, advertising, author and photo credits, page numbers, links, QR codes, servings/time/difficulty labels.
- "tips": only practical advice for making, serving, storing or varying THIS recipe (e.g. "Serve right away; it separates when reheated."), in the recipe's language. A box of advice about another topic belongs to no recipe.
- Ignore crossed-out or struck-through words: the author deleted them, so leave them out and do not guess a replacement.
- Never invent quantities; use "" or [] for what is unknown.

"dish": the printed photo that best shows this recipe's dish, finished or (if nothing better) being cooked — matched by caption, name and contents; never a photo of people, a logo, an ad, or another recipe's dish. "box" is a tight box around that picture of the dish on that photo, as [ymin, xmin, ymax, xmax] from 0 to 1000 (0,0 = top-left), excluding text, people and other dishes. null if no photo shows this dish.

If there is no recipe, return {"pictures": [], "recipes": []}.`;

function asBox(value: unknown): Box | null {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const n = value.map(Number);
  if (!n.every((x) => Number.isFinite(x))) return null;
  const [y0, x0, y1, x1] = n.map((x) => Math.min(1000, Math.max(0, x)));
  // At least a tenth of the photo's width and height, else not a usable picture.
  return y1 - y0 >= 100 && x1 - x0 >= 100 ? [y0, x0, y1, x1] : null;
}

// Parse the {"pictures":[...],"recipes":[...]} answer for `photoCount` photos
// (numbered from 1 in the prompt). Tips go at the end of the method under a
// "Tipy:" heading. When the person added a photo that is mainly a picture of a
// dish, they took it for that recipe: only the recipes pictured on such photos
// are kept, not others that happen to share their page (decided here, since
// models don't follow that rule reliably). A photo counts as such a picture
// when the model lists it in "pictures" or a dish fills half of it.
// A component heading printed in capitals without its colon ("K PODÁVÁNÍ",
// "NA GRILOVANÉ KUŘE") gets one, so the app shows it as a heading.
function withHeadingColons(lines: string[]): string[] {
  return lines.map((l) =>
    l.length <= 40 && !/[\d:]/.test(l) && /\p{Lu}/u.test(l) && l === l.toUpperCase() ? `${l}:` : l,
  );
}

export function toPageRecipes(parsed: unknown, photoCount: number): PageRecipe[] {
  const obj = (parsed ?? {}) as Record<string, unknown>;
  const list = Array.isArray(obj.recipes) ? obj.recipes : [];
  const photoIndex = (v: unknown) => {
    const n = Number(v);
    return Number.isInteger(n) && n >= 1 && n <= photoCount ? n - 1 : null;
  };
  const pictures = new Set(
    (Array.isArray(obj.pictures) ? obj.pictures : [])
      .map(photoIndex)
      .filter((n): n is number => n !== null),
  );
  const recipes = list
    .map((item): PageRecipe => {
      const r = (item ?? {}) as Record<string, unknown>;
      const raw = toDraft(r);
      const draft = {
        ...raw,
        ingredients: withHeadingColons(raw.ingredients),
        instructions: withHeadingColons(raw.instructions),
      };
      const tips = asStringArray(r.tips);
      const photos = Array.isArray(r.photos)
        ? [...new Set(r.photos.map(photoIndex).filter((n): n is number => n !== null))]
        : [];
      const d = (r.dish ?? null) as Record<string, unknown> | null;
      const dishPhoto = d ? photoIndex(d.photo) : null;
      const box = d ? asBox(d.box) : null;
      return {
        ...draft,
        instructions: tips.length ? [...draft.instructions, "Tipy:", ...tips] : draft.instructions,
        photos,
        dish: dishPhoto !== null && box ? { photo: dishPhoto, box } : null,
      };
    })
    .filter((d) => d.title || d.ingredients.length > 0);
  // A lone recipe with no dish found, and a photo without its text (or any
  // recipe's): that photo is the dish picture.
  const textPhotos = new Set(recipes.flatMap((r) => r.photos));
  const spare = [...Array(photoCount).keys()].find((i) => pictures.has(i) || !textPhotos.has(i));
  if (recipes.length === 1 && !recipes[0].dish && spare !== undefined) {
    recipes[0].dish = { photo: spare, box: [0, 0, 1000, 1000] };
  }
  // A dish filling at least half of its photo also makes that photo a picture
  // (models often leave "pictures" empty).
  for (const r of recipes) {
    if (!r.dish) continue;
    const [y0, x0, y1, x1] = r.dish.box;
    if ((y1 - y0) * (x1 - x0) >= 500_000) pictures.add(r.dish.photo);
  }
  const pictured = recipes.filter((r) => r.dish && pictures.has(r.dish.photo));
  return pictured.length > 0 ? pictured : recipes;
}

// Read every recipe from photos taken together (data: URLs, in the order the
// person picked them), with the photos each one is on and where its dish is
// pictured.
export function extractRecipesFromPhotos(
  imageDataUrls: string[],
  modelOverride?: string,
): Promise<PageRecipe[]> {
  const content: ContentPart[] = [
    {
      type: "text",
      text: `Read the recipes from ${
        imageDataUrls.length === 1 ? "this photo" : `these ${imageDataUrls.length} photos`
      }.`,
    },
  ];
  imageDataUrls.forEach((url, i) => {
    content.push({ type: "text", text: `Photo ${i + 1}:` });
    content.push({ type: "image_url", image_url: { url, detail: "high" } });
  });
  return runModels(
    [
      { role: "system", content: PAGES_SYSTEM_PROMPT },
      { role: "user", content },
    ],
    (parsed) => toPageRecipes(parsed, imageDataUrls.length),
    modelOverride,
    PAGES_SCHEMA,
  );
}

const strings = { type: "array", items: { type: "string" } };
const PAGES_SCHEMA: JsonSchema = {
  name: "recipes_from_photos",
  schema: {
    type: "object",
    properties: {
      pictures: { type: "array", items: { type: "integer" } },
      recipes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            ingredients: strings,
            instructions: strings,
            tips: strings,
            photos: { type: "array", items: { type: "integer" } },
            dish: {
              type: ["object", "null"],
              properties: {
                photo: { type: "integer" },
                box: { type: "array", items: { type: "integer" } },
              },
              required: ["photo", "box"],
              additionalProperties: false,
            },
          },
          required: ["title", "ingredients", "instructions", "tips", "photos", "dish"],
          additionalProperties: false,
        },
      },
    },
    required: ["pictures", "recipes"],
    additionalProperties: false,
  },
};

// Is this cropped picture really the dish (not text or another photo)? Models
// sometimes draw the box in the wrong place. The crop is sent small. true when
// no model could answer (most crops are right).
export async function cropShowsDish(cropDataUrl: string, title: string): Promise<boolean> {
  const answer = await withUsage({ purpose: "choose-photos" }, () =>
    askModelsForJson(
      [
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                `This picture was cut from a cookbook or magazine page for the recipe "${title}". ` +
                "Does it mainly show a photo of food — that dish finished, or being cooked — rather than text, a person, a logo or an unrelated photo? " +
                'Answer with JSON only: {"dish": true} or {"dish": false}.',
            },
            { type: "image_url", image_url: { url: cropDataUrl } },
          ],
        },
      ],
      (parsed) => {
        const v = (parsed as Record<string, unknown> | null)?.dish;
        return typeof v === "boolean" ? v : null;
      },
    ),
  );
  return answer ?? true;
}
