// Change an account's sign-in email. Its recipes, sessions and Google/Facebook
// links stay. Run it on every copy of the database (this Mac and the server),
// and update SYNC_USER in .env if it was that account: deploy.sh matches the
// accounts by email.
//
// Run: npx tsx --env-file=.env scripts/set-email.ts old@example.com new@example.com
import { prisma } from "@/lib/prisma";
import { isValidEmail, normalizeEmail } from "@/lib/password";

(async () => {
  const [from, to] = process.argv.slice(2).map((e) => (e ? normalizeEmail(e) : e));
  if (!from || !to || !isValidEmail(to)) {
    console.error("Usage: scripts/set-email.ts <old email> <new email>");
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email: from } });
  if (!user || user.isGuest) {
    console.error("No account with that email.");
    process.exit(1);
  }
  if (await prisma.user.findUnique({ where: { email: to } })) {
    console.error("Another account already has the new email.");
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { email: to } });
  console.log("Done: the account now signs in with the new email.");
  await prisma.$disconnect();
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
