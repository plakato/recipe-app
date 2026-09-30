"use client"; // Error boundaries must be Client Components.

// Shown when a page fails unexpectedly. The details stay in the server log;
// people get an apology and a way to try again.
import Link from "next/link";

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-20 text-center">
      <h1 className="font-display text-3xl">Sorry, something went wrong</h1>
      <p className="text-stone-600 dark:text-stone-400">
        It&rsquo;s not you — something on our side didn&rsquo;t work. Please try again in a moment.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className="rounded-lg bg-olive-600 px-5 py-2.5 font-medium text-white hover:bg-olive-700"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg px-4 py-2.5 font-medium text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          All recipes
        </Link>
      </div>
    </div>
  );
}
