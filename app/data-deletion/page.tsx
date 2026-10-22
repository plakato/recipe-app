import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Zmazanie údajov" };
// The contact comes from .env (PRIVACY_EMAIL), as on the privacy page.
export const dynamic = "force-dynamic";

// How to have your data deleted, public (proxy.ts) — Facebook wants this on
// its own URL (it rejects /privacy#zmazanie). Keep it in step with the
// "Zmazanie údajov" section of app/privacy/page.tsx.
export default function DataDeletionPage() {
  const email = process.env.PRIVACY_EMAIL;
  const contact = email ? (
    <a href={`mailto:${email}`} className="text-olive-700 underline dark:text-olive-400">
      {email}
    </a>
  ) : (
    "e-mail prevádzkovateľa"
  );
  return (
    <article className="mx-auto max-w-2xl space-y-4 text-stone-800 dark:text-stone-200">
      <h1 className="font-display text-3xl">Zmazanie údajov</h1>
      <p>
        Jednotlivé recepty môžete kedykoľvek zmazať sami. Ak chcete zmazať celý účet so všetkými receptmi a
        fotkami, napíšte na {contact} z e-mailu, ktorým sa prihlasujete (aj ak sa prihlasujete cez Google
        alebo Facebook). Zmažeme ho do 30 dní, aj zo záloh, a dáme vám vedieť.
      </p>
      <p>
        Prístup aplikácie k vášmu účtu Google zrušíte na{" "}
        <a href="https://myaccount.google.com/permissions" className="text-olive-700 underline dark:text-olive-400">
          myaccount.google.com/permissions
        </a>
        , k Facebooku v jeho nastaveniach v časti „Aplikácie a weby“.
      </p>
      <p>
        Viac o tom, aké údaje ukladáme:{" "}
        <Link href="/privacy" className="text-olive-700 underline dark:text-olive-400">
          Ochrana súkromia
        </Link>
        .
      </p>
    </article>
  );
}
