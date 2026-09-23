import { describe, it, expect } from "vitest";
import { compareRecipes, findDuplicate, normalizeTitle, stems } from "@/lib/similarity";

const kapustnica = {
  title: "Kapustnica",
  ingredients: ["1 kg kyslá kapusta", "1-2 veľké klobásy", "1 cibuľa", "kúsok zeleru", "3-4 zemiaky", "korenie (soľ, peper, rasca)"],
  instructions: ["Zemiaky uvaríme zvlášť.", "Na oleji opražíme cibuľu, zasypeme múkou a zalejeme vodou.", "Pridáme kapustu, zeler, korenie, klobásu a varíme."],
};
// Same recipe, re-typed with different amounts/inflection and without pepper.
const kapustnicaAgain = {
  title: "Kapustová polievka",
  ingredients: ["kyslej kapusty 1kg", "2 klobásy", "cibuľa", "zeler", "zemiaky 4 ks", "soľ, rasca"],
  instructions: ["Zemiaky uvaríme zvlášť.", "Na oleji opražíme cibuľu, zasypeme múkou, zalejeme vodou.", "Pridáme kapustu, zeler, korenie a klobásu, varíme."],
};
const tomatoA = {
  title: "Paradajková polievka",
  ingredients: ["1 kg paradajok", "1 cibuľa", "2 strúčiky cesnaku", "olivový olej", "bazalka", "soľ"],
  instructions: ["Cibuľu a cesnak opražíme.", "Pridáme paradajky, varíme 20 min.", "Rozmixujeme, dochutíme bazalkou."],
};
const tomatoB = {
  title: "Krémová paradajková",
  ingredients: ["400 g konzerva paradajok", "smotana 200 ml", "maslo", "múka", "cukor", "soľ"],
  instructions: ["Z masla a múky urobíme zápražku.", "Zalejeme paradajkami, povaríme.", "Vmiešame smotanu a cukor."],
};

describe("stems", () => {
  it("drops amounts, units, stopwords, diacritics and inflection", () => {
    expect(stems("1 kg kyslá kapusta (nakrájaná)")).toEqual(["kysla", "kapus"]);
    expect(stems("2 lyžice olivového oleja")).toEqual(["olivo", "oleja"]);
  });
});

describe("normalizeTitle", () => {
  it("ignores case, diacritics and punctuation", () => {
    expect(normalizeTitle("  Kapustnica!! ")).toBe(normalizeTitle("kapustnica"));
    expect(normalizeTitle("Paradajková (od Ley)")).toBe("paradajkova od ley");
  });
});

describe("compareRecipes", () => {
  it("scores a re-typed recipe as a near-duplicate", () => {
    expect(compareRecipes(kapustnica, kapustnicaAgain).score).toBeGreaterThan(0.6);
  });
  it("lets two different tomato soups through", () => {
    expect(compareRecipes(tomatoA, tomatoB).score).toBeLessThan(0.4);
    expect(compareRecipes(kapustnica, tomatoA).score).toBeLessThan(0.3);
  });
});

describe("findDuplicate", () => {
  const others = [
    { id: "k", ...kapustnica },
    { id: "t", ...tomatoA },
  ];
  it("flags an identical title first", () => {
    const v = findDuplicate({ ...tomatoB, title: "kapustnica" }, others);
    expect(v?.kind).toBe("same-title");
    expect(v?.match.id).toBe("k");
  });
  it("flags a near-duplicate with a different title", () => {
    const v = findDuplicate(kapustnicaAgain, others);
    expect(v?.kind).toBe("near-duplicate");
    expect(v?.match.id).toBe("k");
  });
  it("returns null for a genuinely different recipe", () => {
    expect(findDuplicate(tomatoB, others)).toBeNull();
  });
});
