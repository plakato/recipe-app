import { prisma } from "./prisma";

// Login is deferred. For now there is exactly one owner. This helper ensures
// that default user exists and returns its id. When login is added later,
// replace calls to this with the authenticated session's user id.
const DEFAULT_USER_EMAIL = "owner@local";

export async function getDefaultUserId(): Promise<string> {
  const user = await prisma.user.upsert({
    where: { email: DEFAULT_USER_EMAIL },
    update: {},
    create: { email: DEFAULT_USER_EMAIL, name: "Me" },
  });
  return user.id;
}
