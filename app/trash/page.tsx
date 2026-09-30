import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { restoreRecipe, permanentlyDeleteRecipe } from "@/app/actions";
import RecipeImage from "@/components/RecipeImage";
import { RestoreIcon, XIcon } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function TrashPage() {
  const userId = await requireUserId();
  const recipes = await prisma.recipe.findMany({
    where: { userId, deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
  });

  const btn =
    "flex h-10 w-10 items-center justify-center rounded-full transition";
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">Trash</h1>
        <p className="mt-1 text-sm text-stone-500">Restore anytime, or delete forever.</p>
      </div>

      {recipes.length === 0 ? (
        <p className="py-16 text-center text-stone-500">Trash is empty.</p>
      ) : (
        <ul className="space-y-3">
          {recipes.map((recipe) => (
            <li
              key={recipe.id}
              className="flex items-center gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5 dark:bg-stone-900 dark:ring-white/10"
            >
              <RecipeImage
                src={recipe.imagePath}
                seed={recipe.id}
                alt=""
                className="h-16 w-16 flex-none rounded-xl"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display truncate text-lg">{recipe.title}</p>
                {recipe.deletedAt && (
                  <p className="text-xs text-stone-500">
                    Deleted {recipe.deletedAt.toLocaleDateString()}
                  </p>
                )}
              </div>
              <form action={restoreRecipe}>
                <input type="hidden" name="id" value={recipe.id} />
                <button
                  type="submit"
                  title="Restore"
                  aria-label="Restore"
                  className={`${btn} text-stone-500 hover:bg-stone-200/70 hover:text-stone-900 dark:hover:bg-stone-800 dark:hover:text-stone-100`}
                >
                  <RestoreIcon />
                </button>
              </form>
              <form action={permanentlyDeleteRecipe}>
                <input type="hidden" name="id" value={recipe.id} />
                <button
                  type="submit"
                  title="Delete forever"
                  aria-label="Delete forever"
                  className={`${btn} text-brick-600 hover:bg-brick-50 dark:hover:bg-brick-950/40`}
                >
                  <XIcon />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
