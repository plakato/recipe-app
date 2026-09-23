import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { restoreRecipe, permanentlyDeleteRecipe } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const userId = await requireUserId();
  const recipes = await prisma.recipe.findMany({
    where: { userId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trash</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Deleted recipes live here. Restore them anytime, or delete permanently.
        </p>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-10 text-center text-stone-500 dark:border-stone-700">
          Trash is empty.
        </div>
      ) : (
        <ul className="space-y-3">
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{recipe.title}</p>
                {recipe.deletedAt && (
                  <p className="text-xs text-stone-500">
                    Deleted {recipe.deletedAt.toLocaleDateString()}
                  </p>
                )}
              </div>
              <div className="flex flex-none items-center gap-2">
                <form action={restoreRecipe}>
                  <input type="hidden" name="id" value={recipe.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
                  >
                    Restore
                  </button>
                </form>
                <form action={permanentlyDeleteRecipe}>
                  <input type="hidden" name="id" value={recipe.id} />
                  <button
                    type="submit"
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                  >
                    Delete forever
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/"
        className="inline-block text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
      >
        ← Back to recipes
      </Link>
    </div>
  );
}
