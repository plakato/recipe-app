import { describe, expect, it } from "vitest";
import { matches, searchText } from "./recipeSearch";

describe("recipe search", () => {
  const sisky = searchText("Šišky", ["500 g hladkej múky", "1 cibuľa"]);

  it("ignores accents and case", () => {
    expect(matches(sisky, "sisky")).toBe(true);
    expect(matches(sisky, "ŠIŠ")).toBe(true);
    expect(matches(sisky, "cibul")).toBe(true);
  });

  it("needs every word", () => {
    expect(matches(sisky, "muka sisky")).toBe(false);
    expect(matches(sisky, "muky sisky")).toBe(true);
  });

  it("an empty query matches everything", () => {
    expect(matches(sisky, "  ")).toBe(true);
  });
});
