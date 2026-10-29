import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  extractJsonObject,
  extractRecipeFromText,
  parseImageChoices,
  toDraft,
  toDrafts,
  toPageRecipes,
  titlesSoFar,
  withoutShouting,
} from "@/lib/extractRecipe";
import { paidBudgetLeft, recordModelCall } from "@/lib/aiBudget";

// The budget lives in the database; stub it (budget left unless a test says otherwise).
vi.mock("@/lib/aiBudget", () => ({
  paidBudgetLeft: vi.fn(async () => true),
  recordModelCall: vi.fn(async () => {}),
}));

describe("extractJsonObject", () => {
  it("parses a plain JSON object", () => {
    expect(extractJsonObject('{"title":"Cake"}')).toEqual({ title: "Cake" });
  });
  it("parses inside a ```json fence", () => {
    const raw = '```json\n{"title":"Cake"}\n```';
    expect(extractJsonObject(raw)).toEqual({ title: "Cake" });
  });
  it("parses inside a bare ``` fence", () => {
    const raw = '```\n{"a":1}\n```';
    expect(extractJsonObject(raw)).toEqual({ a: 1 });
  });
  it("ignores prose surrounding the object", () => {
    const raw = 'Here is your recipe: {"title":"Cake"} Enjoy!';
    expect(extractJsonObject(raw)).toEqual({ title: "Cake" });
  });
  it("throws when there is no JSON object", () => {
    expect(() => extractJsonObject("no json here")).toThrow();
  });
});

describe("toDraft", () => {
  it("normalizes a full object", () => {
    const draft = toDraft({
      title: "  Cake  ",
      ingredients: ["2 eggs", "  flour  "],
      instructions: ["Mix", "Bake"],
    });
    expect(draft).toEqual({
      title: "Cake",
      ingredients: ["2 eggs", "flour"],
      instructions: ["Mix", "Bake"],
    });
  });
  it("filters non-string / empty array entries", () => {
    const draft = toDraft({
      title: "X",
      ingredients: ["a", 2, null, "", "  ", "b"],
      instructions: [],
    });
    expect(draft.ingredients).toEqual(["a", "b"]);
    expect(draft.instructions).toEqual([]);
  });
  it("turns empty strings and missing fields into undefined/[]", () => {
    const draft = toDraft({ title: "" });
    expect(draft.title).toBe("");
    expect(draft.ingredients).toEqual([]);
    expect(draft.instructions).toEqual([]);
  });
  it("handles null/garbage input safely", () => {
    expect(toDraft(null).ingredients).toEqual([]);
    expect(toDraft(undefined).title).toBe("");
  });
});

describe("toDrafts", () => {
  it("returns every recipe in a {recipes:[...]} answer, dropping empties", () => {
    const drafts = toDrafts({
      recipes: [
        { title: "A", ingredients: ["x"], instructions: ["y"] },
        { title: "", ingredients: [], instructions: [] },
        { title: "B", ingredients: ["z"], instructions: [] },
      ],
    });
    expect(drafts.map((d) => d.title)).toEqual(["A", "B"]);
  });
  it("accepts a bare single recipe object", () => {
    expect(toDrafts({ title: "Solo", ingredients: ["1"], instructions: [] })).toHaveLength(1);
  });
  it("returns [] for no recipes", () => {
    expect(toDrafts({ recipes: [] })).toEqual([]);
    expect(toDrafts(null)).toEqual([]);
  });
});

describe("parseImageChoices", () => {
  it("turns 1-based image numbers into indexes, one per recipe", () => {
    expect(parseImageChoices('{"photos": [3, 1, "2"]}', 3, 5)).toEqual([2, 0, 1]);
  });

  it("uses -1 for recipes no image shows, and allows shared images", () => {
    expect(parseImageChoices('```json\n{"photos":[1,0,1]}\n```', 3, 2)).toEqual([0, -1, 0]);
  });

  it("rejects answers of the wrong length, out of range or unusable", () => {
    expect(parseImageChoices('{"photos": [1, 2]}', 3, 5)).toBeNull();
    expect(parseImageChoices('{"photos": [6]}', 1, 5)).toBeNull();
    expect(parseImageChoices('{"photos": [1.5]}', 1, 5)).toBeNull();
    expect(parseImageChoices("the second one", 1, 5)).toBeNull();
  });
});

describe("paid model fallback", () => {
  const RECIPE = JSON.stringify({ title: "Cake", ingredients: ["flour"], instructions: ["bake"] });
  const NONE = JSON.stringify({ title: "", ingredients: [], instructions: [] });
  let calls: string[];

  // Fake OpenRouter: each model answers with a status and (for 200) a body.
  function fakeOpenRouter(answers: Record<string, [number, string?]>) {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const model = JSON.parse(init.body).model as string;
        calls.push(model);
        const [status, content] = answers[model];
        return new Response(
          status === 200
            ? JSON.stringify({
                choices: [{ message: { content } }],
                usage: { cost: 0.002, prompt_tokens: 1200, completion_tokens: 80 },
              })
            : "busy",
          { status },
        );
      }),
    );
  }

  beforeEach(() => {
    vi.stubEnv("OPENROUTER_API_KEY", "test");
    vi.stubEnv("OPENROUTER_MODEL", "free-a");
    vi.stubEnv("OPENROUTER_MODEL_FALLBACK", "free-b");
    vi.stubEnv("OPENROUTER_MODEL_HQ", "paid");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.mocked(paidBudgetLeft).mockResolvedValue(true);
    vi.mocked(recordModelCall).mockClear();
  });

  it("is not used when a free model answers", async () => {
    fakeOpenRouter({ "free-a": [200, RECIPE], "free-b": [404], paid: [200, RECIPE] });
    await expect(extractRecipeFromText("x")).resolves.toMatchObject({ title: "Cake" });
    expect(calls).toEqual(["free-a"]);
  });

  it("is used when every free model is busy, and its cost is recorded", async () => {
    fakeOpenRouter({ "free-a": [404], "free-b": [404], paid: [200, RECIPE] });
    await expect(extractRecipeFromText("x")).resolves.toMatchObject({ title: "Cake" });
    expect(calls).toEqual(["free-a", "free-b", "paid"]);
    expect(recordModelCall).toHaveBeenCalledWith({
      model: "paid",
      costUsd: 0.002,
      promptTokens: 1200,
      completionTokens: 80,
    });
  });

  it("is not used once the budget is spent: the person hears it's busy", async () => {
    vi.mocked(paidBudgetLeft).mockResolvedValue(false);
    fakeOpenRouter({ "free-a": [404], "free-b": [404], paid: [200, RECIPE] });
    await expect(extractRecipeFromText("x")).rejects.toMatchObject({ code: "busy" });
    expect(calls).toEqual(["free-a", "free-b"]);
  });

  it("is not asked again when a free model found no recipe", async () => {
    fakeOpenRouter({ "free-a": [200, NONE], "free-b": [404], paid: [200, RECIPE] });
    await expect(extractRecipeFromText("x")).rejects.toMatchObject({ code: "no-recipe" });
    expect(calls).toEqual(["free-a", "free-b"]);
  });

  it("records free calls too (tokens for the statistics), at their reported cost", async () => {
    fakeOpenRouter({ "free-a:free": [200, RECIPE] });
    vi.stubEnv("OPENROUTER_MODEL", "free-a:free");
    await extractRecipeFromText("x");
    expect(recordModelCall).toHaveBeenCalledWith(
      expect.objectContaining({ model: "free-a:free", promptTokens: 1200, completionTokens: 80 }),
    );
  });
});

describe("toPageRecipes", () => {
  const orange = {
    title: "Pečené kuře na pomerančích",
    ingredients: ["1 kuře"],
    instructions: ["Upečte."],
    tips: ["Nechte odpočinout."],
    photos: [1, 2],
    dish: { photo: 2, box: [100, 150, 600, 600] },
  };
  const mandarin = {
    title: "Křupavé mandarinkové kuře",
    ingredients: ["700g kuřecích řízků"],
    instructions: ["Osmažte."],
    photos: [1],
    dish: { photo: 1, box: [100, 100, 270, 330] },
  };

  it("keeps only the recipes pictured on a photo that is mainly a dish", () => {
    const recipes = toPageRecipes({ pictures: [2], recipes: [mandarin, orange] }, 2);
    expect(recipes.map((r) => r.title)).toEqual(["Pečené kuře na pomerančích"]);
  });

  it("treats a photo that a dish fills by half as a picture", () => {
    const full = { ...orange, dish: { photo: 2, box: [10, 0, 999, 999] } };
    const recipes = toPageRecipes({ pictures: [], recipes: [mandarin, full] }, 2);
    expect(recipes.map((r) => r.title)).toEqual(["Pečené kuře na pomerančích"]);
  });

  it("gives a lone recipe the photo without recipe text as its dish", () => {
    const noDish = { ...orange, photos: [1], dish: null };
    const [r] = toPageRecipes({ pictures: [], recipes: [noDish] }, 2);
    expect(r.dish).toEqual({ photo: 1, box: [0, 0, 1000, 1000] });
  });

  it("adds the colon to headings printed in capitals", () => {
    const caps = { ...orange, ingredients: ["NA GRILOVANÉ KUŘE", "3 stroužky česneku", "K PODÁVÁNÍ", "hrst koriandru"] };
    const [r] = toPageRecipes({ recipes: [caps] }, 2);
    expect(r.ingredients).toEqual(["NA GRILOVANÉ KUŘE:", "3 stroužky česneku", "K PODÁVÁNÍ:", "hrst koriandru"]);
  });

  it("joins an ingredient line starting with + to the one before it", () => {
    const plus = { ...orange, ingredients: ["Plnka:", "+ soľ", "hrst petržlenu", "+ na ozdobenie", "1 citrón"] };
    const [r] = toPageRecipes({ recipes: [plus] }, 2);
    expect(r.ingredients).toEqual(["Plnka:", "+ soľ", "hrst petržlenu + na ozdobenie", "1 citrón"]);
  });

  it("makes 'Na korpus' and the like headings", () => {
    const parts = { ...orange, ingredients: ["Na korpus", "2 vejce", "Na pudinkový krém", "320 g mléka", "Na želé a dekorace", "250 ml vody"] };
    const [r] = toPageRecipes({ recipes: [parts] }, 2);
    expect(r.ingredients).toEqual(["Na korpus:", "2 vejce", "Na pudinkový krém:", "320 g mléka", "Na želé a dekorace:", "250 ml vody"]);
  });

  it("joins 'na ozdobu:' turned into a heading back to its ingredient", () => {
    const soup = { ...orange, ingredients: ["2 lžíce petrželky", "na ozdobu:", "1 lžička oregana", "Na ozdobu:", "kolečka citronu"] };
    const [r] = toPageRecipes({ recipes: [soup] }, 2);
    expect(r.ingredients).toEqual(["2 lžíce petrželky + na ozdobu", "1 lžička oregana", "Na ozdobu:", "kolečka citronu"]);
  });

  it("adds no colons when the whole card is written in capitals", () => {
    const caps = { ...orange, ingredients: ["2 VAJCIA", "HRNČEK MÚKY", "SOĽ"] };
    const [r] = toPageRecipes({ recipes: [caps] }, 2);
    expect(r.ingredients).toEqual(["2 VAJCIA", "HRNČEK MÚKY", "SOĽ"]);
  });

  it("writes a title printed in capitals like a sentence", () => {
    const [r] = toPageRecipes({ recipes: [{ ...orange, title: "PEČENÉ KUŘE NA POMERANČÍCH" }] }, 2);
    expect(r.title).toBe("Pečené kuře na pomerančích");
  });

  it("keeps titles that aren't all capitals as they are", () => {
    expect(withoutShouting("Butter Chicken")).toBe("Butter Chicken");
    expect(withoutShouting("Koláč s BIO jablkami")).toBe("Koláč s BIO jablkami");
    expect(withoutShouting("ŠIŠKY")).toBe("Šišky");
    expect(withoutShouting("A")).toBe("A");
    expect(withoutShouting("")).toBe("");
  });

  it("keeps every recipe when no photo is mainly a dish", () => {
    const recipes = toPageRecipes({ pictures: [], recipes: [mandarin, orange] }, 2);
    expect(recipes).toHaveLength(2);
  });

  it("uses 0-based photo indexes and puts tips under a heading", () => {
    const [r] = toPageRecipes({ recipes: [orange] }, 2);
    expect(r.photos).toEqual([0, 1]);
    expect(r.dish).toEqual({ photo: 1, box: [100, 150, 600, 600] });
    expect(r.instructions).toEqual(["Upečte.", "Tipy:", "Nechte odpočinout."]);
  });

  it("drops dish boxes that are out of range or too small", () => {
    const tiny = { ...orange, dish: { photo: 2, box: [100, 100, 150, 150] } };
    const badPhoto = { ...orange, dish: { photo: 5, box: [0, 0, 1000, 1000] } };
    expect(toPageRecipes({ recipes: [tiny] }, 2)[0].dish).toBeNull();
    expect(toPageRecipes({ recipes: [badPhoto] }, 2)[0].dish).toBeNull();
  });
});

describe("titlesSoFar", () => {
  it("gives each title whose closing quote has arrived, in normal case", () => {
    const partial = '{"pictures":[],"recipes":[{"title":"BUTTER CHICKEN","ingredients":["1 kg"]},{"title":"Naan s \\"cesnakom\\"","ingr';
    expect(titlesSoFar(partial)).toEqual(["Butter chicken", 'Naan s "cesnakom"']);
  });

  it("waits for a title still being written", () => {
    expect(titlesSoFar('{"pictures":[],"recipes":[{"title":"Kapust')).toEqual([]);
    expect(titlesSoFar("")).toEqual([]);
  });
});
