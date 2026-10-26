import { describe, expect, it } from "vitest";
import { matches, search, searchText } from "./recipeSearch";

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

  it("puts recipes matching by name before those matching by an ingredient", () => {
    const recipes = [
      { title: "Koláč s jablkami", search: searchText("Koláč s jablkami", ["2 jablká"]) },
      { title: "Jablková štrúdľa", search: searchText("Jablková štrúdľa", ["4 jablká"]) },
      { title: "Hrachová polievka", search: searchText("Hrachová polievka", ["hrach"]) },
      { title: "Jablkový džús", search: searchText("Jablkový džús", []) },
    ];
    expect(search(recipes, "jablk").map((r) => r.title)).toEqual([
      "Koláč s jablkami", "Jablková štrúdľa", "Jablkový džús",
    ]);
    const salad = { title: "Šalát", search: searchText("Šalát", ["1 jablko"]) };
    expect(search([salad, recipes[3]], "jablk").map((r) => r.title)).toEqual(["Jablkový džús", "Šalát"]);
  });
});
