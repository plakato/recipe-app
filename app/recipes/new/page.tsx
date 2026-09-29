import Link from "next/link";

// Recipes are added from a photo or a link; the AI fills the form and the
// user reviews it before saving. (Manual entry and voice import were
// removed on 2026-09-29 — editing an existing recipe still works.)
export default function NewRecipePage() {
  const card =
    "flex flex-col items-start gap-2 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300 hover:shadow-md dark:border-stone-800 dark:bg-stone-900";
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Add a recipe</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link href="/recipes/import/photo" className={card}>
          <span className="text-2xl">📷</span>
          <span className="font-semibold">From a photo</span>
          <span className="text-sm text-stone-600 dark:text-stone-400">
            A cookbook page, a handwritten card, or a screenshot.
          </span>
        </Link>
        <Link href="/recipes/import/url" className={card}>
          <span className="text-2xl">🔗</span>
          <span className="font-semibold">From a link</span>
          <span className="text-sm text-stone-600 dark:text-stone-400">
            A recipe website or a video whose description has the recipe.
          </span>
        </Link>
      </div>
      <p className="text-sm text-stone-500">
        Either way you get to check and edit the recipe before it is saved.
      </p>
    </div>
  );
}
