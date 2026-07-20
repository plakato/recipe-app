import Link from "next/link";
import UrlImport from "@/components/UrlImport";

export default function ImportFromUrlPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Import from a link</h1>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
          Paste a recipe page&rsquo;s address. The AI reads the page and fills in
          the recipe for you to review before saving.
        </p>
      </div>

      <UrlImport />

      <Link
        href="/recipes/new"
        className="inline-block text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
      >
        ← Enter by hand instead
      </Link>
    </div>
  );
}
