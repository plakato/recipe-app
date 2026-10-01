// Mark the account whose recipes visitors browse and the demo copies (at
// most one). Your email is only typed here, never stored in config.
//
// Run: npx tsx --env-file=.env scripts/set-showcase.ts you@example.com
//      npx tsx --env-file=.env scripts/set-showcase.ts --off   (public browsing off)
import { prisma } from "@/lib/prisma";
import { normalizeEmail } from "@/lib/password";

(async () => {
  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: scripts/set-showcase.ts <email> | --off");
    process.exit(1);
  }
  if (arg === "--off") {
    const { count } = await prisma.user.updateMany({ where: { isShowcase: true }, data: { isShowcase: false } });
    console.log(count ? "Public browsing is off." : "No account was marked; nothing changed.");
  } else {
    const user = await prisma.user.findUnique({ where: { email: normalizeEmail(arg) } });
    if (!user || user.isGuest) {
      console.error("No account with that email.");
      process.exit(1);
    }
    await prisma.$transaction([
      prisma.user.updateMany({ where: { isShowcase: true }, data: { isShowcase: false } }),
      prisma.user.update({ where: { id: user.id }, data: { isShowcase: true } }),
    ]);
    const shown = await prisma.recipe.count({
      where: { userId: user.id, deletedAt: null, sourceType: { not: "url" } },
    });
    console.log(`Done: visitors now browse ${user.name ?? "this account"}'s ${shown} recipes.`);
  }
  await prisma.$disconnect();
})().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
