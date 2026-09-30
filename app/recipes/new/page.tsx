import Link from "next/link";
import { CameraIcon, LinkIcon } from "@/components/Icons";

// Recipes are added from a photo or a link; the AI fills the form and the
// user reviews it before saving.
export default function NewRecipePage() {
  const card =
    "group flex flex-col items-center gap-3 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-stone-900 dark:ring-white/10";
  const icon =
    "flex h-16 w-16 items-center justify-center rounded-full bg-blush-100 text-blush-700 transition group-hover:bg-blush-600 group-hover:text-white dark:bg-blush-900/40 dark:text-blush-300";
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-6">
      <h1 className="font-display text-center text-3xl">New recipe</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link href="/recipes/import/photo" className={card}>
          <span className={icon}><CameraIcon className="h-7 w-7" /></span>
          <span className="font-display text-xl">From a photo</span>
        </Link>
        <Link href="/recipes/import/url" className={card}>
          <span className={icon}><LinkIcon className="h-7 w-7" /></span>
          <span className="font-display text-xl">From a link</span>
        </Link>
      </div>
    </div>
  );
}
