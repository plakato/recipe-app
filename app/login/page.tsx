import Link from "next/link";
import AuthCard, { fieldClass, labelClass } from "@/components/AuthCard";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  missing: "Please enter your email and password.",
  invalid: "Wrong email or password.",
  locked: "Too many attempts. Please wait a minute and try again.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <AuthCard title="Sign in" error={error ? ERRORS[error] ?? "Sign-in failed." : null}>
      <form method="post" action="/api/auth/login" className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" autoFocus className={fieldClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Password</label>
          <input id="password" name="password" type="password" required autoComplete="current-password" className={fieldClass} />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-700"
        >
          Sign in
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-500">
        Got an invite?{" "}
        <Link href="/signup" className="text-amber-700 hover:underline dark:text-amber-400">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}
