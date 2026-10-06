import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { safeNext } from "@/lib/demo";
import { getShowcaseUserId } from "@/lib/showcase";
import DemoStart from "@/components/DemoStart";
import { turnstileSiteKey } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

// Shown when a visitor without an account first tries to change something:
// explains the demo before giving them their own temporary copy.
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);
  if (!(await getShowcaseUserId())) redirect("/login");

  return (
    <div className="mx-auto max-w-md space-y-6 py-10">
      <h1 className="font-display text-3xl">Try it yourself</h1>
      <div className="space-y-3 text-stone-700 dark:text-stone-300">
        <p>
          You&rsquo;ll get your own copy of these recipes to edit, delete or add to — even
          from a photo. The originals stay exactly as they are.
        </p>
        <p className="rounded-lg border border-olive-200 bg-olive-50 px-4 py-3 text-sm text-olive-900 dark:border-olive-900/50 dark:bg-olive-950/30 dark:text-olive-200">
          <strong>Your changes are kept only for this visit</strong> — for a day after you last
          use it — unless you sign up.
        </p>
      </div>
      <DemoStart next={next} siteKey={turnstileSiteKey()} />
      <p className="text-sm text-stone-500">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-olive-700 hover:underline dark:text-olive-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
