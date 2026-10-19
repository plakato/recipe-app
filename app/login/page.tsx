import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import AuthCard, { fieldClass, labelClass } from "@/components/AuthCard";
import SocialButtons from "@/components/SocialButtons";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing: "Zadajte prosím e-mail a heslo.",
  invalid: "Nesprávny e-mail alebo heslo.",
  locked: "Príliš veľa pokusov. Počkajte prosím minútu a skúste to znova.",
  social: "Prihlásenie cez Google/Facebook sa nepodarilo. Skúste to prosím znova.",
  cancelled: "Prihlásenie ste zrušili.",
  noemail: "Facebook nám neposlal váš e-mail, a bez neho účet nevytvoríme. Zaregistrujte sa prosím e-mailom.",
  linkexists: "Účet s týmto e-mailom už existuje. Prihláste sa heslom alebo cez Google.",
  limit: "Z vašej siete dnes vzniklo veľa nových účtov. Skúste to prosím zajtra — prepáčte!",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  // Already signed in (with a valid session): nothing to do here. Demo
  // guests may still sign in, or sign up to keep their copy.
  const current = await getSessionUser();
  if (current && !current.isGuest) redirect("/");
  const { error, next } = await searchParams;
  return (
    <AuthCard title="Prihlásenie" error={error ? ERRORS[error] ?? "Prihlásenie sa nepodarilo." : null}>
      <SocialButtons next={next} />
      <form method="post" action="/api/auth/login" className="mt-4 space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="email" className={labelClass}>E-mail</label>
          <input id="email" name="email" type="email" required autoComplete="email" autoFocus className={fieldClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Heslo</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className={fieldClass} />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-olive-600 px-4 py-2.5 font-medium text-white hover:bg-olive-700"
        >
          Prihlásiť sa
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-500">
        Nemáte účet?{" "}
        <Link href="/signup" className="text-olive-700 hover:underline dark:text-olive-400">
          Zaregistrujte sa
        </Link>
      </p>
    </AuthCard>
  );
}
