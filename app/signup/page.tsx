import Link from "next/link";
import AuthCard, { fieldClass, labelClass } from "@/components/AuthCard";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

export const dynamic = "force-dynamic";

const ERRORS: Record<string, string> = {
  closed: "Sign-up is not open right now.",
  invite: "That invite code isn't right.",
  email: "Please enter a valid email address.",
  short: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  mismatch: "The two passwords don't match.",
  exists: "There is already an account with that email. Try signing in.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AuthCard title="Create your account" error={error ? ERRORS[error] ?? "Sign-up failed." : null}>
      <form method="post" action="/api/auth/signup" className="space-y-4">
        <div>
          <label htmlFor="invite" className={labelClass}>Invite code</label>
          <input id="invite" name="invite" type="text" required autoComplete="off" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="name" className={labelClass}>Name</label>
          <input id="name" name="name" type="text" autoComplete="name" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="email" className={labelClass}>Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="password" className={labelClass}>Password</label>
          <input id="password" name="password" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="confirm" className={labelClass}>Repeat password</label>
          <input id="confirm" name="confirm" type="password" required minLength={MIN_PASSWORD_LENGTH} autoComplete="new-password" className={fieldClass} />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-amber-600 px-4 py-2.5 font-medium text-white hover:bg-amber-700"
        >
          Create account
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-stone-500">
        Already have one?{" "}
        <Link href="/login" className="text-amber-700 hover:underline dark:text-amber-400">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
