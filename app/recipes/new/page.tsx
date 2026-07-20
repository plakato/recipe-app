import Link from "next/link";
import RecipeForm from "@/components/RecipeForm";
import { createRecipe } from "@/app/actions";

export default function NewRecipePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Add a recipe</h1>

      <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        <p className="text-sm font-medium">Let AI do it for you</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link
            href="/recipes/import/url"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            🔗 Import from a link
          </Link>
          <Link
            href="/recipes/import/photo"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            📷 From a photo
          </Link>
          <Link
            href="/recipes/import/voice"
            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium hover:bg-stone-100 dark:border-stone-700 dark:hover:bg-stone-800"
          >
            🎤 By voice
          </Link>
        </div>
      </div>

      <p className="text-sm text-stone-600 dark:text-stone-400">
        …or enter it by hand below.
      </p>
      <RecipeForm action={createRecipe} submitLabel="Save recipe" />
    </div>
  );
}
