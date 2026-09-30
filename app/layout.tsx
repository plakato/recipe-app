import type { Metadata } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { PlusIcon } from "@/components/Icons";
import SaltLogo from "@/components/SaltLogo";
import UserMenu from "@/components/UserMenu";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display serif for recipe titles — a warm, cookbook feel.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
  axes: ["opsz", "SOFT", "WONK"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      {/* suppressHydrationWarning: browser extensions (e.g. ColorZilla) add
          attributes to <body> that the server never rendered. Harmless. */}
      <body
        suppressHydrationWarning
        className="min-h-full bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100"
      >
        <header className="sticky top-0 z-20 border-b border-stone-200/60 bg-[var(--background)]/85 backdrop-blur dark:border-stone-800/60">
          <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
            <Link href="/" className="group" aria-label="recepty – all recipes">
              <SaltLogo />
            </Link>
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/recipes/new"
                  title="Add a recipe"
                  aria-label="Add a recipe"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-blush-300 text-blush-950 transition hover:rotate-90 hover:bg-blush-400"
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
