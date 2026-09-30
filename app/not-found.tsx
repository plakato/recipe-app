import Link from "next/link";

// Shown for unknown addresses and recipes that don't exist (or aren't yours).
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <h1 className="font-display text-3xl">We couldn&rsquo;t find that</h1>
      <p className="text-stone-600 dark:text-stone-400">
        This page or recipe doesn&rsquo;t exist — maybe it was moved or deleted.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white hover:bg-olive-700"
      >
        Back to all recipes
      </Link>
    </div>
  );
}
