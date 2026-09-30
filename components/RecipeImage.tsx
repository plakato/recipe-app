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

// All tints of the one palette (blush + cream), varied only in lightness
// and direction, so image-less tiles still sit calmly in the grid.
const placeholders = [
  { bg: "from-blush-100 to-stone-100 dark:from-blush-900 dark:to-stone-900", emoji: "🍲" },
  { bg: "from-stone-100 to-blush-200 dark:from-stone-900 dark:to-blush-900", emoji: "🍰" },
  { bg: "from-blush-200 to-blush-50 dark:from-blush-950 dark:to-blush-900", emoji: "🥗" },
  { bg: "from-stone-200 to-blush-100 dark:from-stone-800 dark:to-blush-950", emoji: "🥣" },
  { bg: "from-blush-50 to-blush-200 dark:from-blush-900 dark:to-stone-950", emoji: "🧁" },
  { bg: "from-stone-100 to-stone-200 dark:from-stone-900 dark:to-stone-800", emoji: "🥐" },
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
