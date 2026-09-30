// Shows a recipe's image, or a warm placeholder when there isn't one.

type Props = {
  src?: string | null;
  alt: string;
  // Tailwind classes for the wrapper (aspect ratio / rounding / size).
  className?: string;
  // Extra classes for the <img> (e.g. hover zoom).
  imgClassName?: string;
  // Any stable string (e.g. the recipe id): picks the placeholder's colour
  // and emoji, so image-less recipes don't all look the same.
  seed?: string;
};

const placeholders = [
  { bg: "from-amber-200 via-orange-100 to-rose-100 dark:from-amber-900/60 dark:via-orange-950 dark:to-stone-900", emoji: "🍲" },
  { bg: "from-rose-200 via-pink-100 to-orange-100 dark:from-rose-900/60 dark:via-pink-950 dark:to-stone-900", emoji: "🍰" },
  { bg: "from-lime-200 via-emerald-100 to-amber-100 dark:from-lime-900/50 dark:via-emerald-950 dark:to-stone-900", emoji: "🥗" },
  { bg: "from-sky-200 via-cyan-100 to-amber-50 dark:from-sky-900/50 dark:via-cyan-950 dark:to-stone-900", emoji: "🥣" },
  { bg: "from-violet-200 via-fuchsia-100 to-rose-100 dark:from-violet-900/50 dark:via-fuchsia-950 dark:to-stone-900", emoji: "🧁" },
  { bg: "from-yellow-200 via-amber-100 to-lime-100 dark:from-yellow-900/50 dark:via-amber-950 dark:to-stone-900", emoji: "🥐" },
];

function pick(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) | 0;
  return placeholders[Math.abs(h) % placeholders.length];
}

export default function RecipeImage({ src, alt, className = "", imgClassName = "", seed = "" }: Props) {
  if (src) {
    return (
      <div className={`overflow-hidden bg-stone-200 dark:bg-stone-800 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={`h-full w-full object-cover ${imgClassName}`} />
      </div>
    );
  }
  const { bg, emoji } = pick(seed);
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br ${bg} ${className}`}
      aria-label="No image yet"
      role="img"
    >
      <span className="text-5xl opacity-80 drop-shadow-sm">{emoji}</span>
    </div>
  );
}
