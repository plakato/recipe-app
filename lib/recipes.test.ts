import { describe, it, expect } from "vitest";
import {
  isSectionHeading,
  groupSections,
  parseList,
  linesToList,
  listToLines,
  recipeToDraft,
} from "@/lib/recipes";

describe("parseList", () => {
  it("parses a JSON string array", () => {
    expect(parseList('["a","b","c"]')).toEqual(["a", "b", "c"]);
  });
  it("returns [] for null/undefined/empty", () => {
    expect(parseList(null)).toEqual([]);
    expect(parseList(undefined)).toEqual([]);
    expect(parseList("")).toEqual([]);
  });
  it("returns [] for invalid JSON", () => {
    expect(parseList("not json")).toEqual([]);
  });
  it("returns [] when JSON is not an array", () => {
    expect(parseList('{"a":1}')).toEqual([]);
  });
  it("filters out non-string entries", () => {
    expect(parseList('["a",1,null,"b"]')).toEqual(["a", "b"]);
  });
});

describe("linesToList", () => {
  it("splits, trims, and drops blank lines", () => {
    expect(linesToList("  a \n\n b \n")).toEqual(["a", "b"]);
  });
  it("handles CRLF line endings", () => {
    expect(linesToList("a\r\nb")).toEqual(["a", "b"]);
  });
  it("returns [] for empty/null", () => {
    expect(linesToList("")).toEqual([]);
    expect(linesToList(null)).toEqual([]);
  });
});

describe("listToLines / round-trip", () => {
  it("joins with newlines", () => {
    expect(listToLines(["a", "b"])).toBe("a\nb");
  });
  it("round-trips a clean list", () => {
    const list = ["2 cups flour", "1 tsp salt"];
    expect(linesToList(listToLines(list))).toEqual(list);
  });
});

describe("recipeToDraft", () => {
  it("maps a row and converts nulls to undefined", () => {
    const row = {
      id: "1",
      userId: "u",
      title: "Cake",
      ingredients: '["2 eggs","flour"]',
      instructions: '["Mix","Bake"]',
      sourceType: "manual",
      sourceUrl: null,
      imagePath: "/uploads/x.jpg",
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    // recipeToDraft only uses a type import, so a plain object is fine.
    expect(recipeToDraft(row as never)).toEqual({
      title: "Cake",
      ingredients: ["2 eggs", "flour"],
      instructions: ["Mix", "Bake"],
      sourceUrl: undefined,
      imagePath: "/uploads/x.jpg",
    });
  });
});

describe("section headings", () => {
  it("recognises short colon-terminated lines and nothing else", () => {
    expect(isSectionHeading("Cesto:")).toBe(true);
    expect(isSectionHeading("Na plnku:")).toBe(true);
    expect(isSectionHeading("2 vajcia")).toBe(false);
    expect(isSectionHeading("soľ: štipka")).toBe(false);
    expect(isSectionHeading("Pečieme 20 min pri 180:")).toBe(false);
  });
  it("groups a list at its headings", () => {
    expect(groupSections(["Cesto:", "múka", "maslo", "Plnka:", "tvaroh"])).toEqual([
      { heading: "Cesto", items: ["múka", "maslo"] },
      { heading: "Plnka", items: ["tvaroh"] },
    ]);
  });
  it("returns one unnamed section for a flat list", () => {
    expect(groupSections(["múka", "maslo"])).toEqual([{ heading: null, items: ["múka", "maslo"] }]);
    expect(groupSections([])).toEqual([]);
  });
});
