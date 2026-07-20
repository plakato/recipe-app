// Shows a recipe's image, or a friendly placeholder when there isn't one yet.
// The placeholder is intentional-looking (warm gradient + emoji) and is what
// we'll later replace with an AI-generated image based on the recipe.

type Props = {
  src?: string | null;
  alt: string;
  // Tailwind classes for the wrapper (control aspect ratio / rounding / size).
  className?: string;
};

export default function RecipeImage({ src, alt, className = "" }: Props) {
  if (src) {
    return (
      <div className={`overflow-hidden bg-stone-100 dark:bg-stone-800 ${className}`}>
        {/* Plain img: files live in /public/uploads, served statically. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-amber-100 to-stone-200 dark:from-amber-950/40 dark:to-stone-800 ${className}`}
      aria-label="No image yet"
      role="img"
    >
      <span className="text-3xl opacity-70">🍽️</span>
    </div>
  );
}
