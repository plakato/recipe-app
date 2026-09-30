import Link from "next/link";
import { CameraIcon, LinkIcon } from "@/components/Icons";

// Recipes are added from a photo or a link; the AI fills the form and the
// user reviews it before saving. Flat, editorial layout: big type and
// hairline-separated rows rather than raised cards.
const options = [
  {
    href: "/recipes/import/photo",
    Icon: CameraIcon,
    title: "From a photo",
    hint: "A cookbook page, a handwritten card, a screenshot",
  },
  {
    href: "/recipes/import/url",
    Icon: LinkIcon,
    title: "From a link",
    hint: "Paste the address of any recipe page",
  },
];

export default function NewRecipePage() {
  return (
    <div className="mx-auto max-w-2xl py-6 sm:py-12">
      <h1 className="font-display mb-8 text-4xl leading-tight sm:mb-12 sm:text-6xl">
        Where&rsquo;s the recipe from?
      </h1>
      <ul className="divide-y divide-stone-200 border-y border-stone-200 dark:divide-stone-800 dark:border-stone-800">
        {options.map(({ href, Icon, title, hint }) => (
          <li key={href}>
            <Link href={href} className="group flex items-center gap-5 py-6 sm:gap-6 sm:py-8">
              <Icon className="h-7 w-7 flex-none text-stone-400 transition group-hover:text-blush-600 dark:text-stone-500" />
              <span className="min-w-0 flex-1">
                <span className="font-display block text-2xl transition group-hover:text-blush-700 sm:text-3xl dark:group-hover:text-blush-300">
                  {title}
                </span>
                <span className="mt-1 block text-sm text-stone-500 dark:text-stone-400">{hint}</span>
              </span>
              <span
                aria-hidden
                className="text-2xl text-blush-400 transition-transform duration-300 group-hover:translate-x-1.5"
              >
                &rarr;
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
