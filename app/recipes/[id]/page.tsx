import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { parseList } from "@/lib/recipes";
import { softDeleteRecipe } from "@/app/actions";
import RecipeImage from "@/components/RecipeImage";

export const dynamic = "force-dynamic";

export default async function RecipeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const userId = await requireUserId();
  const recipe = await prisma.recipe.findFirst({
    where: { id, userId, deletedAt: null },
  });

  if (!recipe) notFound();

  const ingredients = parseList(recipe.ingredients);
  const instructions = parseList(recipe.instructions);

  return (
    <article className="space-y-8">
      <div>
        <Link
          href="/"
          className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
        >
          ← All recipes
        </Link>
        <h1 className="mt-2 text-3xl font-bold tracking-tight">
          {recipe.title}
        </h1>
        {recipe.description && (
          <p className="mt-2 text-stone-600 dark:text-stone-400">
            {recipe.description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-stone-500">
          {recipe.servings && <span>Serves {recipe.servings}</span>}
          {recipe.prepTime && <span>Prep {recipe.prepTime}</span>}
          {recipe.cookTime && <span>Cook {recipe.cookTime}</span>}
        </div>
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-sm text-amber-700 hover:underline dark:text-amber-500"
          >
            Original source ↗
          </a>
        )}
      </div>

      <RecipeImage
        src={recipe.imagePath}
        alt={recipe.title}
        className="aspect-video w-full rounded-2xl"
      />

      <section className="grid grid-cols-1 gap-8 sm:grid-cols-[1fr_1.4fr]">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Ingredients</h2>
          {ingredients.length ? (
            <ul className="space-y-1.5 text-stone-800 dark:text-stone-200">
              {ingredients.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-600">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-500">None listed.</p>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">Instructions</h2>
          {instructions.length ? (
            <ol className="space-y-3 text-stone-800 dark:text-stone-200">
              {instructions.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-amber-100 text-sm font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-stone-500">None listed.</p>
          )}
        </div>
      </section>

      <div className="flex items-center gap-3 border-t border-stone-200 pt-6 dark:border-stone-800">
        <Link
          href={`/recipes/${recipe.id}/edit`}
          className="rounded-lg border border-stone-300 px-4 py-2 font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
        >
          Edit
        </Link>
        <form action={softDeleteRecipe}>
          <input type="hidden" name="id" value={recipe.id} />
          <button
            type="submit"
            className="rounded-lg px-4 py-2 font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
          >
            Move to Trash
          </button>
        </form>
      </div>
    </article>
  );
}
