import Link from "next/link";
import PhotoImport from "@/components/PhotoImport";

export default function ImportFromPhotoPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">From a photo</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Photograph a cookbook page, a handwritten card, or a screenshot. The AI
          reads it and fills in the recipe for you to review before saving.
        </p>
      </div>

      <PhotoImport />

      <Link
        href="/recipes/new"
        className="inline-block text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
      >
        ← Other ways to add
      </Link>
    </div>
  );
}
