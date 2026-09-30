import Link from "next/link";
import { redirect } from "next/navigation";
import { URL_IMPORT_ENABLED } from "@/lib/features";
import { CameraIcon, LinkIcon } from "@/components/Icons";

// Recipes are added from a photo or a link; the AI fills the form and the
// user reviews it before saving. Colour-block layout: two flat panels with
// big type and an oversized line icon, no borders or shadows.
const options = [
  {
    href: "/recipes/import/photo",
    Icon: CameraIcon,
    title: ["From a", "photo"],
    hint: "Cookbook page, handwritten card or screenshot",
    block: "bg-olive-100 hover:bg-olive-200 text-olive-950 dark:bg-olive-900/50 dark:hover:bg-olive-900/70 dark:text-olive-100",
    icon: "text-olive-200 dark:text-olive-800",
  },
  {
    href: "/recipes/import/url",
    Icon: LinkIcon,
    title: ["From a", "link"],
    hint: "Paste the address of any recipe page",
    block: "bg-stone-200/70 hover:bg-stone-200 text-stone-900 dark:bg-stone-800/70 dark:hover:bg-stone-800 dark:text-stone-100",
    icon: "text-stone-300 dark:text-stone-700",
  },
];

export default function NewRecipePage() {
  // With link import paused, photo is the only option: skip the chooser.
  if (!URL_IMPORT_ENABLED) redirect("/recipes/import/photo");
  return (
    <div className="mx-auto max-w-3xl py-2 sm:py-10">
      <h1 className="font-display mb-6 text-3xl sm:mb-8 sm:text-5xl">Add a recipe</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map(({ href, Icon, title, hint, block, icon }) => (
          <Link
            key={href}
            href={href}
            className={`group relative flex aspect-[16/10] flex-col overflow-hidden rounded-3xl p-6 transition-colors sm:aspect-[5/4] sm:p-8 ${block}`}
          >
            <Icon
              className={`absolute -bottom-10 -right-10 h-40 w-40 [stroke-width:0.8] transition-transform duration-500 group-hover:-rotate-6 group-hover:scale-105 sm:h-52 sm:w-52 ${icon}`}
            />
            <span className="font-display relative text-4xl leading-none sm:text-5xl">
              {title[0]}
              <br />
              {title[1]}
            </span>
            <span className="relative mt-3 max-w-[15rem] text-sm opacity-75">{hint}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
