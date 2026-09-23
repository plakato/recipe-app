// For CLI scripts: resolve the account that imported recipes should belong to.
// Usage in a script: const userId = await userIdForScript(args) where args
// contains "--user <email>". Exits with a clear message if missing/unknown.
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/password";

export async function userIdForScript(argv: string[]): Promise<string> {
  const i = argv.indexOf("--user");
  const email = i >= 0 ? normalizeEmail(argv[i + 1] ?? "") : "";
  if (!email) {
    const users = await prisma.user.findMany({ select: { email: true } });
    console.error(
      "Missing --user <email>. Accounts: " +
        (users.map((u) => u.email).join(", ") || "(none yet — sign up in the app first)"),
    );
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No account with email ${email}.`);
    process.exit(1);
  }
  return user.id;
}

// Remove "--user <email>" from argv so positional parsing stays simple.
export function stripUserArg(argv: string[]): string[] {
  const i = argv.indexOf("--user");
  return i >= 0 ? [...argv.slice(0, i), ...argv.slice(i + 2)] : argv;
}
