// Shows a recipe's image, or a warm placeholder when there isn't one.

type Props = {
  src?: string | null;
  alt: string;
  // Tailwind classes for the wrapper (aspect ratio / rounding / size).
  className?: string;
  // Extra classes for the <img> (e.g. hover zoom).
  imgClassName?: string;
};

export default function RecipeImage({ src, alt, className = "", imgClassName = "" }: Props) {
  if (src) {
    return (
      <div className={`overflow-hidden bg-stone-200 dark:bg-stone-800 ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={`h-full w-full object-cover ${imgClassName}`} />
      </div>
    );
  }
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-amber-200 via-orange-100 to-stone-200 dark:from-amber-900/50 dark:via-stone-800 dark:to-stone-900 ${className}`}
      aria-label="No image yet"
      role="img"
    >
      <span className="text-4xl opacity-60">🍽️</span>
    </div>
  );
}
