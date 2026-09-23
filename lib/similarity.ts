// Near-duplicate detection for recipes. Pure functions, no database.
//
// Two different tomato soups should pass; the same soup saved twice (maybe
// minus the pepper) should be caught. We compare the *words* that remain in
// the ingredient list after stripping quantities and units, and likewise the
// instructions — so wording order, amounts and Slovak/Czech inflection
// (crude stemming) don't matter much.

const UNITS = new Set([
  "g", "kg", "mg", "ml", "l", "dl", "cl", "ks", "pc", "pcs", "cup", "cups",
  "tbsp", "tsp", "oz", "lb", "lbs", "pinch", "clove", "cloves", "slice", "slices",
  "can", "cans", "pack", "package", "balenie", "balicek", "lyzica", "lyzice",
  "lyzicka", "lyzicky", "pl", "kl", "cl", "hrncek", "hrnceky", "salka", "salky",
  "stipka", "kusok", "kus", "kusy", "kusov", "plátok", "platok", "platky",
  "struk", "struciky", "strucik", "konzerva", "konzervy", "sacok", "sacky",
  "zvazok", "vetvicka", "vetvicky", "spetka", "spetky", "hrst", "hrnek", "hrnky",
  "sklenice", "sklenicka", "krajic", "kousek", "kousky", "stroužek", "strouzek",
  "strouzky", "polevkova", "kavova", "lzice", "lzicka", "lzicky", "spetka",
]);

const STOPWORDS = new Set([
  "a", "and", "or", "of", "the", "to", "in", "on", "with", "for", "into", "until",
  "then", "about", "approx", "cca", "asi", "na", "do", "sa", "se", "si", "z", "zo",
  "s", "so", "v", "vo", "k", "ku", "o", "od", "po", "pre", "pri", "za", "je", "su",
  "alebo", "nebo", "podla", "podle", "chuti", "chuť", "trochu", "trocha", "male",
  "maly", "velky", "velke", "velka", "cerstve", "cerstvy", "cerstva", "cerstvej",
  "dobrovolne", "volitelne", "optional", "popr", "pripadne", "případně",
]);

export function stripDiacritics(s: string): string {
  return s.normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export function normalizeTitle(title: string): string {
  return stripDiacritics(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

// Tokenize a line into crude stems: lowercase, no diacritics, no numbers,
// no units/stopwords, each word truncated to 5 chars (covers most Slovak/
// Czech inflections: kapusta/kapustu/kapusty -> "kapus").
export function stems(text: string): string[] {
  return stripDiacritics(text)
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ") // parentheticals: "(optional)", "(od Ley)"
    .replace(/[0-9]+([.,/][0-9]+)?/g, " ")
    .replace(/[^a-z]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !UNITS.has(w) && !STOPWORDS.has(w))
    .map((w) => w.slice(0, 5));
}

export function jaccard(a: Iterable<string>, b: Iterable<string>): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 && B.size === 0) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  return inter / (A.size + B.size - inter);
}

export type Comparable = {
  title: string;
  ingredients: string[];
  instructions: string[];
};

export type Similarity = {
  sameTitle: boolean;
  ingredientScore: number; // 0..1
  instructionScore: number; // 0..1
  score: number; // combined 0..1
};

export function compareRecipes(a: Comparable, b: Comparable): Similarity {
  const sameTitle =
    normalizeTitle(a.title) !== "" && normalizeTitle(a.title) === normalizeTitle(b.title);
  const ingredientScore = jaccard(
    a.ingredients.flatMap(stems),
    b.ingredients.flatMap(stems),
  );
  const instructionScore = jaccard(
    a.instructions.flatMap(stems),
    b.instructions.flatMap(stems),
  );
  // Ingredients carry most of the signal; instructions confirm it. A recipe
  // with no instructions on either side is judged on ingredients alone.
  const hasSteps = a.instructions.length > 0 && b.instructions.length > 0;
  const score = hasSteps
    ? 0.65 * ingredientScore + 0.35 * instructionScore
    : ingredientScore;
  return { sameTitle, ingredientScore, instructionScore, score };
}

// Tuned on the family collection (2026-09-23, 86 recipes): the closest pair
// of genuinely different recipes scored 0.37 (two yeast doughs); a re-typed
// copy of the same recipe with slightly different wording scores ~0.7+.
export const DUPLICATE_THRESHOLD = 0.6;

export type DuplicateVerdict = {
  match: { id: string; title: string };
  score: number;
  // The candidate also has the same name as the match. Two versions of a
  // dish are fine, but not under one name — the user must rename.
  sameTitle: boolean;
} | null;

// Check a candidate against the user's other recipes by CONTENT (ingredients
// and steps). Same-name recipes with different content are allowed — e.g. a
// Slovak "Sloppy Joes" from a photo next to an English one from a website.
export function findDuplicate(
  candidate: Comparable,
  others: (Comparable & { id: string })[],
): DuplicateVerdict {
  let best: DuplicateVerdict = null;
  for (const other of others) {
    const s = compareRecipes(candidate, other);
    if (s.score >= DUPLICATE_THRESHOLD && (!best || s.score > best.score)) {
      best = {
        match: { id: other.id, title: other.title },
        score: s.score,
        sameTitle: s.sameTitle,
      };
    }
  }
  return best;
}
