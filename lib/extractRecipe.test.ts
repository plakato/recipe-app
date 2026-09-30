import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import {
  extractJsonObject,
  extractRecipeFromText,
  parseBestImage,
  toDraft,
  toDrafts,
} from "@/lib/extractRecipe";

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

describe("parseBestImage", () => {
  it("turns the 1-based image number into an index", () => {
    expect(parseBestImage('{"best": 3}', 5)).toBe(2);
    expect(parseBestImage('```json\n{"best":"1"}\n```', 5)).toBe(0);
  });

  it("returns -1 when the model says none shows the dish", () => {
    expect(parseBestImage('{"best": 0}', 5)).toBe(-1);
  });

  it("rejects out-of-range or unusable answers", () => {
    expect(parseBestImage('{"best": 6}', 5)).toBeNull();
    expect(parseBestImage('{"best": 2.5}', 5)).toBeNull();
    expect(parseBestImage("the second one", 5)).toBeNull();
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
          status === 200 ? JSON.stringify({ choices: [{ message: { content } }] }) : "busy",
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
  });

  it("is not used when a free model answers", async () => {
    fakeOpenRouter({ "free-a": [200, RECIPE], "free-b": [404], paid: [200, RECIPE] });
    await expect(extractRecipeFromText("x")).resolves.toMatchObject({ title: "Cake" });
    expect(calls).toEqual(["free-a"]);
  });

  it("is used when every free model is busy", async () => {
    fakeOpenRouter({ "free-a": [404], "free-b": [404], paid: [200, RECIPE] });
    await expect(extractRecipeFromText("x")).resolves.toMatchObject({ title: "Cake" });
    expect(calls).toEqual(["free-a", "free-b", "paid"]);
  });

  it("is not asked again when a free model found no recipe", async () => {
    fakeOpenRouter({ "free-a": [200, NONE], "free-b": [404], paid: [200, RECIPE] });
    await expect(extractRecipeFromText("x")).rejects.toThrow(/did not find a recipe/);
    expect(calls).toEqual(["free-a", "free-b"]);
  });
});
