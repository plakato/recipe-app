import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { safeNext } from "@/lib/demo";
import { getShowcaseUserId } from "@/lib/showcase";
import DemoStart from "@/components/DemoStart";
import { turnstileSiteKey } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

// Where a visitor without an account lands when they first edit, delete or
// add: gives them their own temporary copy and carries on to what they wanted.
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);
  if (await getSessionUser()) redirect(next);
  if (!(await getShowcaseUserId())) redirect("/login");

  // No page to read: it starts the demo straight away (components/DemoStart.tsx);
  // the demo-mode note at the bottom of every page explains the rest.
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <DemoStart next={next} siteKey={turnstileSiteKey()} />
    </div>
  );
}
