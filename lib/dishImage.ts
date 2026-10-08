// A picture of the finished dish, for recipes that have none (roadmap step 6).
// Two steps, both on free models: a text model works out from the title,
// ingredients and method what the dish is and how it looks when served
// (describeDish), then an image model draws it (drawDish).
//
// Image providers, in order:
// - Cloudflare Workers AI, when CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_AI_TOKEN
//   are set (free: 10,000 neurons a day, about 170 FLUX.1 schnell pictures).
//   CLOUDFLARE_IMAGE_MODEL picks the model (default flux-1-schnell).
// - Pollinations, which needs no key; without POLLINATIONS_API_KEY it is
//   rate-limited (one request per ~15 s), weaker and watermarked.
//
// Server-only (reads API keys).

import { askModelsForJson } from "@/lib/extractRecipe";
import { recordModelCall } from "@/lib/aiBudget";
import { withUsage } from "@/lib/usageContext";

export type DishSource = { title: string; ingredients: string[]; instructions: string[] };

const WIDTH = 1024;
const HEIGHT = 768;

const DESCRIBE_PROMPT = `You are a food stylist preparing a photo shoot. You get a home recipe (title, ingredients, method), often in Slovak or Czech, sometimes with a short, vague or missing title. Work out which dish it really is, from all three, and how it looks when it is finished and served.

Return ONLY a JSON object: {"dish": string, "prompt": string}
- "dish": the dish's name in English, e.g. "Slovak potato dumplings with sheep cheese (bryndzové halušky)".
- "prompt": one English paragraph (30–60 words) for an image model. Start with the kind of dish and what it is served in (e.g. "A bowl of clear soup", "A slice of layered cake on a plate"). Then name only the 3–5 things most visible on top, with their shape and colour (e.g. "thin julienned carrot strips"), and the garnish the recipe has. Then: overhead or 45° view, natural daylight, simple home kitchen table, realistic food photography.

Rules:
- Decide the kind of dish from the method and the amounts, not only the title or the section headings: a lot of broth, stock, water or milk compared to the solid ingredients (e.g. 600 ml stock for a few hundred grams of meat and vegetables) means a soup or a stew, even when the title doesn't say so or the liquid is listed under "sauce".
- Describe what the recipe makes, not its ingredients raw or the steps of making it.
- Only show what the recipe has: no invented sides, sauces or garnishes.
- A sauce, dressing, filling, spread or glaze is shown the way it is eaten, on what the recipe says it is for (e.g. cheese sauce over pasta, a cream filling inside the cake it fills).
- Traditional dishes look like their traditional, homemade form (e.g. halušky are small irregular dumpling pieces, not round balls).
- No people, hands, text, labels or logos.`;

// Step 1: the image-model prompt for this recipe, or null if no text model
// gave a usable answer.
export function describeDish(recipe: DishSource): Promise<{ dish: string; prompt: string } | null> {
  const material = [
    `Title: ${recipe.title || "(none)"}`,
    `Ingredients:\n${recipe.ingredients.join("\n") || "(none)"}`,
    `Method:\n${recipe.instructions.join("\n") || "(none)"}`,
  ]
    .join("\n\n")
    .slice(0, 6000);
  return withUsage({ purpose: "describe-dish" }, () =>
    askModelsForJson(
      [
        { role: "system", content: DESCRIBE_PROMPT },
        { role: "user", content: material },
      ],
      (parsed) => {
        const o = (parsed ?? {}) as Record<string, unknown>;
        const dish = typeof o.dish === "string" ? o.dish.trim() : "";
        const prompt = typeof o.prompt === "string" ? o.prompt.trim() : "";
        return prompt.length >= 20 ? { dish, prompt } : null;
      },
    ),
  );
}

type Drawn = { buf: Buffer; model: string };

type Provider = { name: string; draw: (prompt: string, seed: number) => Promise<Drawn> };

const cloudflare: Provider = {
  name: "cloudflare",
  async draw(prompt, seed) {
    const account = process.env.CLOUDFLARE_ACCOUNT_ID;
    const model = process.env.CLOUDFLARE_IMAGE_MODEL || "@cf/black-forest-labs/flux-1-schnell";
    const url = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${model}`;
    const auth = { Authorization: `Bearer ${process.env.CLOUDFLARE_AI_TOKEN}` };
    // FLUX.1 takes JSON (always square-ish, max 8 steps); the FLUX.2 models
    // take multipart form fields and a size.
    let res: Response;
    if (model.includes("flux-2")) {
      const form = new FormData();
      form.set("prompt", prompt);
      form.set("width", String(WIDTH));
      form.set("height", String(HEIGHT));
      form.set("seed", String(seed));
      res = await fetch(url, { method: "POST", headers: auth, body: form });
    } else {
      res = await fetch(url, {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, steps: 6 }),
      });
    }
    if (!res.ok) {
      throw new Error(`Cloudflare ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
    }
    const data = (await res.json()) as { result?: { image?: string } };
    const image = data.result?.image;
    if (!image) throw new Error("Cloudflare returned no image");
    return { buf: Buffer.from(image, "base64"), model: `cloudflare/${model.replace(/^@cf\//, "")}` };
  },
};

const pollinations: Provider = {
  name: "pollinations",
  async draw(prompt, seed) {
    const key = process.env.POLLINATIONS_API_KEY;
    const model = process.env.POLLINATIONS_IMAGE_MODEL || (key ? "zimage" : "flux");
    const params = new URLSearchParams({
      width: String(WIDTH),
      height: String(HEIGHT),
      seed: String(seed),
      model,
      nologo: "true",
      ...(key ? { key } : {}),
    });
    const base = key ? "https://gen.pollinations.ai/image/" : "https://image.pollinations.ai/prompt/";
    const res = await fetch(`${base}${encodeURIComponent(prompt)}?${params}`, {
      signal: AbortSignal.timeout(120_000),
    });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !type.startsWith("image/")) {
      throw new Error(`Pollinations ${res.status}: ${(await res.text().catch(() => "")).slice(0, 300)}`);
    }
    return { buf: Buffer.from(await res.arrayBuffer()), model: `pollinations/${model}` };
  },
};

function providers(): Provider[] {
  const list: Provider[] = [];
  if (process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_AI_TOKEN) list.push(cloudflare);
  if (process.env.DISH_IMAGE_POLLINATIONS !== "off") list.push(pollinations);
  return list;
}

// Step 2: draw the prompt with the first provider that answers. Returns a
// JPEG (re-encoded, so every provider's output is the same kind of file).
export function drawDish(prompt: string, seed = Math.floor(Math.random() * 1e9)): Promise<Drawn> {
  return withUsage({ purpose: "draw-dish" }, async () => {
    const errors: string[] = [];
    for (const provider of providers()) {
      try {
        const drawn = await provider.draw(prompt, seed);
        const { default: sharp } = await import("sharp");
        const buf = await sharp(drawn.buf).jpeg({ quality: 85 }).toBuffer();
        await recordModelCall({ model: drawn.model, costUsd: 0, promptTokens: 0, completionTokens: 0 });
        return { buf, model: drawn.model };
      } catch (err) {
        errors.push(`${provider.name}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    throw new Error(`No image provider could draw the dish. ${errors.join(" | ")}`);
  });
}
