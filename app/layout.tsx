import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CookingPot } from "lucide-react";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { PlusIcon } from "@/components/Icons";
import UserMenu from "@/components/UserMenu";
import { getShowcaseUserId } from "@/lib/showcase";
import { runHousekeeping } from "@/lib/housekeeping";
import { after } from "next/server";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Receptík",
  description: "Naša rodinná zbierka receptov",
  // Not in search engines for now (roadmap step 2; reconsider later).
  robots: { index: false, follow: false },
  // On an iPhone's home screen (Share → Add to Home Screen): opens without
  // Safari's bars, named Receptík. Android reads app/manifest.ts.
  appleWebApp: { capable: true, title: "Receptík", statusBarStyle: "default" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  const showcase = !user && (await getShowcaseUserId());
  // Demo mode: browsing the public recipes, or in a demo (guest) account.
  const demoMode = Boolean(showcase) || !!user?.isGuest;
  // Hourly tidy-up (expired demos, unused photos), after the page is sent.
  after(runHousekeeping);
  return (
    <html
      lang="sk"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) add
          attributes to <body> that the server never rendered. Harmless. */}
      <body
        suppressHydrationWarning
        className="min-h-full bg-white text-stone-900 dark:bg-stone-950 dark:text-stone-100"
      >
        <header className="sticky top-0 z-20 border-b border-black/5 bg-[var(--background)]/85 backdrop-blur dark:border-stone-800/60">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" title="Všetky recepty" aria-label="Všetky recepty" className="text-stone-900 transition hover:text-olive-600 dark:text-stone-100">
              <CookingPot className="h-7 w-7" strokeWidth={2} />
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/recipes/new"
                  title="Pridať recept"
                  aria-label="Pridať recept"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-olive-600 text-white transition hover:bg-olive-700"
                >
                  <PlusIcon />
                </Link>
                <UserMenu email={user.email} guest={user.isGuest} admin={user.isAdmin} />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* With public browsing on, visitors can add too (as a demo). */}
                {showcase && (
                  <Link
                    href="/recipes/new"
                    title="Pridať recept"
                    aria-label="Pridať recept"
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-olive-600 text-white transition hover:bg-olive-700"
                  >
                    <PlusIcon />
                  </Link>
                )}
                <Link
                  href="/login"
                  className="rounded-lg bg-stone-100 px-3.5 py-2 text-sm font-medium text-stone-900 transition hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700"
                >
                  Prihlásiť sa
                </Link>
              </div>
            )}
          </nav>
        </header>
        <main className={`mx-auto max-w-6xl px-4 py-6 sm:px-6 ${demoMode ? "pb-20" : ""}`}>{children}</main>
        {demoMode && (
          <div
            role="note"
            className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-stone-900/95 px-4 py-2.5 text-center text-sm text-stone-100 backdrop-blur"
          >
            Kým sa neprihlásite, ste v <strong>režime demo</strong> — zmeny, ktoré urobíte, sa
            neuložia natrvalo.{" "}
            <Link href="/login" className="font-semibold text-olive-300 underline-offset-2 hover:underline">
              Prihlásiť sa
            </Link>
            {" · "}
            <Link href="/signup" className="font-semibold text-olive-300 underline-offset-2 hover:underline">
              Zaregistrovať sa
            </Link>
          </div>
        )}

      </body>
    </html>
  );
}
