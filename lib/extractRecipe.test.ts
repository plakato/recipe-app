import { describe, it, expect } from "vitest";
import { extractJsonObject, toDraft } from "@/lib/extractRecipe";

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
      description: "Tasty",
      ingredients: ["2 eggs", "  flour  "],
      instructions: ["Mix", "Bake"],
      servings: "4",
      prepTime: "10 min",
      cookTime: "45 min",
    });
    expect(draft).toEqual({
      title: "Cake",
      description: "Tasty",
      ingredients: ["2 eggs", "flour"],
      instructions: ["Mix", "Bake"],
      servings: "4",
      prepTime: "10 min",
      cookTime: "45 min",
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
    const draft = toDraft({ title: "", description: "" });
    expect(draft.title).toBe("");
    expect(draft.description).toBeUndefined();
    expect(draft.servings).toBeUndefined();
    expect(draft.ingredients).toEqual([]);
    expect(draft.instructions).toEqual([]);
  });
  it("handles null/garbage input safely", () => {
    expect(toDraft(null).ingredients).toEqual([]);
    expect(toDraft(undefined).title).toBe("");
  });
});
