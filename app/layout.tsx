import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CookingPot } from "lucide-react";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { PlusIcon } from "@/components/Icons";
import UserMenu from "@/components/UserMenu";
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
  title: "Family Recipes",
  description: "Our family recipe collection",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();
  return (
    <html
      lang="en"
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
            <Link href="/" title="All recipes" aria-label="All recipes" className="text-stone-900 transition hover:text-olive-600 dark:text-stone-100">
              <CookingPot className="h-7 w-7" strokeWidth={2} />
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/recipes/new"
                  title="Add a recipe"
                  aria-label="Add a recipe"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-olive-600 text-white transition hover:bg-olive-700"
                >
                  <PlusIcon />
                </Link>
                <UserMenu email={user.email} />
              </div>
            ) : null}
          </nav>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">{children}</main>

      </body>
    </html>
  );
}
