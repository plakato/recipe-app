// Shared shell for the login and sign-up pages.
export const fieldClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 outline-none focus:border-blush-500 focus:ring-2 focus:ring-blush-200 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100";
export const labelClass = "block text-sm font-medium text-stone-700 dark:text-stone-300";

export default function AuthCard({
  title,
  error,
  children,
}: {
  title: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="font-display mb-6 text-center text-3xl">{title}</h1>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-brick-200 bg-brick-50 px-3 py-2 text-sm text-brick-700 dark:border-brick-900 dark:bg-brick-950 dark:text-brick-300"
        >
          {error}
        </p>
      )}
      <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        {children}
      </div>
    </div>
  );
}
