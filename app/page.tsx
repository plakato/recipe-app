import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDefaultUserId } from "@/lib/user";
import { parseList } from "@/lib/recipes";
import RecipeImage from "@/components/RecipeImage";

// Always render fresh from the database.
export const dynamic = "force-dynamic";

export default async function Home() {
  const userId = await getDefaultUserId();
  const recipes = await prisma.recipe.findMany({
    where: { userId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Recipes</h1>
        <span className="text-sm text-stone-500">
          {recipes.length} {recipes.length === 1 ? "recipe" : "recipes"}
        </span>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center dark:border-stone-700">
          <p className="text-stone-600 dark:text-stone-400">
            No recipes yet.
          </p>
          <Link
            href="/recipes/new"
            className="mt-4 inline-block rounded-lg bg-amber-600 px-4 py-2 font-medium text-white hover:bg-amber-700"
          >
            Add your first recipe
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recipes.map((recipe) => {
            const ingredientCount = parseList(recipe.ingredients).length;
            return (
              <li key={recipe.id}>
                <Link
                  href={`/recipes/${recipe.id}`}
                  className="block h-full overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900"
                >
                  <RecipeImage
                    src={recipe.imagePath}
                    alt={recipe.title}
                    className="aspect-video w-full"
                  />
                  <div className="p-4">
                  <h2 className="font-semibold">{recipe.title}</h2>
                  {recipe.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">
                      {recipe.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-stone-500">
                    <span>{ingredientCount} ingredients</span>
                    {recipe.cookTime && <span>· {recipe.cookTime}</span>}
                    {recipe.servings && <span>· serves {recipe.servings}</span>}
                  </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
