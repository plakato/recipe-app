// List pairs of recipes that look like duplicates of each other.
// Run: npx tsx --env-file=.env scripts/find-duplicates.ts --user <email> [min-score]
import { prisma } from "@/lib/prisma";
import { parseList } from "@/lib/recipes";
import { compareRecipes } from "@/lib/similarity";
import { stripUserArg, userIdForScript } from "@/lib/script-user";

(async () => {
  const userId = await userIdForScript(process.argv);
  const min = Number(stripUserArg(process.argv.slice(2))[0] ?? 0.5);
  const rows = await prisma.recipe.findMany({ where: { userId, deletedAt: null } });
  const recipes = rows.map((r) => ({
    id: r.id,
    title: r.title,
    ingredients: parseList(r.ingredients),
    instructions: parseList(r.instructions),
  }));
  const pairs: { a: string; b: string; s: ReturnType<typeof compareRecipes> }[] = [];
  for (let i = 0; i < recipes.length; i++) {
    for (let j = i + 1; j < recipes.length; j++) {
      const s = compareRecipes(recipes[i], recipes[j]);
      if (s.score >= min) pairs.push({ a: recipes[i].title, b: recipes[j].title, s });
    }
  }
  pairs.sort((x, y) => y.s.score - x.s.score);
  console.log(`${recipes.length} recipes, ${pairs.length} pair(s) with score >= ${min}\n`);
  for (const p of pairs) {
    console.log(
      `${p.s.score.toFixed(2)}  (ingr ${p.s.ingredientScore.toFixed(2)}, steps ${p.s.instructionScore.toFixed(2)})${p.s.sameTitle ? "  SAME TITLE" : ""}\n` +
        `      ${p.a}\n      ${p.b}`,
    );
  }
  await prisma.$disconnect();
})();
