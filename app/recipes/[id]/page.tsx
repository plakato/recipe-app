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
        <div className="mt-2 flex items-start justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight">{recipe.title}</h1>
          <SourceButton recipe={recipe} />
        </div>
        {recipe.description && (
          <p className="mt-2 text-stone-600 dark:text-stone-400">
            {recipe.description}
          </p>
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

// Small icon-only button that opens where the recipe came from: the web page
// for URL imports, the original photo (full size) for photo imports.
function SourceButton({
  recipe,
}: {
  recipe: { sourceType: string; sourceUrl: string | null; imagePath: string | null };
}) {
  const isPhoto = recipe.sourceType === "photo" && !!recipe.imagePath;
  const href = recipe.sourceUrl ?? (isPhoto ? recipe.imagePath : null);
  if (!href) return null;
  const label = recipe.sourceUrl ? "Open the original page" : "Open the original photo";
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={label}
      aria-label={label}
      className="mt-1 shrink-0 rounded-full border border-stone-300 p-2 text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:border-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
    >
      {recipe.sourceUrl ? (
        // link / external icon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
        </svg>
      ) : (
        // photo icon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      )}
    </a>
  );
}
