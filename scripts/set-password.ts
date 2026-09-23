// Admin helper: (re)set a family member's password, or create their account,
// from the terminal. There is no "forgot password" email flow, so this is how
// resets work. Also signs the user out everywhere (clears their sessions).
// Run: npx tsx --env-file=.env scripts/set-password.ts <email> <new-password> [name]
import { prisma } from "@/lib/prisma";
import { hashPassword, isValidEmail, MIN_PASSWORD_LENGTH, normalizeEmail } from "@/lib/password";

const [rawEmail, password, name] = process.argv.slice(2);
if (!rawEmail || !password) {
  console.error("Usage: npx tsx --env-file=.env scripts/set-password.ts <email> <new-password> [name]");
  process.exit(1);
}
const email = normalizeEmail(rawEmail);
if (!isValidEmail(email)) {
  console.error("That doesn't look like an email address.");
  process.exit(1);
}
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  process.exit(1);
}

(async () => {
  const hashed = await hashPassword(password);
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({
      where: { id: existing.id },
      data: { password: hashed, ...(name ? { name } : {}) },
    });
    const { count } = await prisma.session.deleteMany({ where: { userId: existing.id } });
    console.log(`Password updated for ${email}; ${count} session(s) signed out.`);
  } else {
    await prisma.user.create({ data: { email, password: hashed, name: name || null } });
    console.log(`Account created for ${email}.`);
  }
  await prisma.$disconnect();
})();
