// Let an account open the usage statistics (/admin/stats). The email is only
// typed here, never stored in config.
//
// Run: npx tsx --env-file=.env scripts/set-admin.ts you@example.com [--off]
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/password";

(async () => {
  const email = process.argv[2];
  const off = process.argv.includes("--off");
  if (!email || email.startsWith("--")) {
    console.error("Usage: scripts/set-admin.ts <email> [--off]");
    process.exit(1);
  }
  const user = await prisma.user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user || user.isGuest) {
    console.error("No account with that email.");
    process.exit(1);
  }
  await prisma.user.update({ where: { id: user.id }, data: { isAdmin: !off } });
  console.log(off ? "Done: no longer an admin." : "Done: this account can open /admin/stats.");
  await prisma.$disconnect();
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
