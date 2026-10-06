import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AuthCard, { fieldClass, labelClass } from "@/components/AuthCard";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";
import Turnstile from "@/components/Turnstile";
import { turnstileSiteKey } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  closed: "Registrácia teraz nie je otvorená.",
  invite: "Kód pozvánky nie je správny.",
  email: "Zadajte prosím platnú e-mailovú adresu.",
  short: `Heslo musí mať aspoň ${MIN_PASSWORD_LENGTH} znakov.`,
  mismatch: "Heslá sa nezhodujú.",
  exists: "Účet s týmto e-mailom už existuje. Skúste sa prihlásiť.",
  bot: "Nepodarilo sa overiť, že ste človek (automatická kontrola neprešla). Skúste to prosím znova.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  // Already signed in (with a valid session): nothing to do here. Demo
  // guests may still sign in, or sign up to keep their copy.
  const current = await getSessionUser();
  if (current && !current.isGuest) redirect("/");
  const { error } = await searchParams;
  const siteKey = turnstileSiteKey();
  return (
    <AuthCard title="Vytvorte si účet" error={error ? ERRORS[error] ?? "Registrácia sa nepodarila." : null}>
      <form method="post" action="/api/auth/signup" className="space-y-4">
        <div>
          <label htmlFor="invite" className={labelClass}>Kód pozvánky</label>
          <input id="invite" name="invite" type="text" required autoComplete="off" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="name" className={labelClass}>Meno</label>
          <input id="name" name="name" type="text" autoComplete="name" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Heslo</label>
          <input id="password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="confirm" className={labelClass}>Heslo znova</label>
          <input id="confirm" name="confirm" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={fieldClass} />
        </div>
        {/* Invisible bot check (lib/turnstile.ts); adds a one-time token. */}
        {siteKey && <Turnstile siteKey={siteKey} action="signup" />}
        <button
          type="submit"
          className="w-full rounded-lg bg-olive-600 px-4 py-2.5 font-medium text-white hover:bg-olive-700"
        >
          Vytvoriť účet
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-500">
        Už máte účet?{" "}
        <Link href="/login" className="text-olive-700 hover:underline dark:text-olive-400">
          Prihláste sa
        </Link>
      </p>
    </AuthCard>
  );
}
