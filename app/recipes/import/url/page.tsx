import Link from "next/link";
import { notFound } from "next/navigation";
import { URL_IMPORT_ENABLED } from "@/lib/features";
import UrlImport from "@/components/UrlImport";

export default function ImportFromUrlPage() {
  if (!URL_IMPORT_ENABLED) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl">From a link</h1>
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
        ← Other ways to add
      </Link>
    </div>
  );
}
