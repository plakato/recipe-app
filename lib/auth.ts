// Session management + the "data access layer" every page and action calls.
// Server-only: touches cookies and the database.
//
// Flow: login/signup (app/api/auth/*) create a Session row and set an
// httpOnly cookie with a random token. We store only sha256(token) as the row
// id. Pages call requireUser()/requireUserId(); proxy.ts does a cheap
// cookie-presence check up front so unauthenticated visitors are redirected
// before any rendering.
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/auth-constants";

export { SESSION_COOKIE };
const SESSION_DAYS = 30;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

// Create a session for the user and return the Set-Cookie parameters.
// Callers in Route Handlers set the cookie on their response.
export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await prisma.session.create({
    data: { id: hashToken(token), userId, expiresAt },
  });
  return { name: SESSION_COOKIE, value: token, options: cookieOptions(expiresAt) };
}

// Delete the current session row (if any). Cookie removal is the caller's job.
export async function destroySession(token: string | undefined) {
  if (!token) return;
  await prisma.session.deleteMany({ where: { id: hashToken(token) } });
}

// The signed-in user for this request, or null. Memoized per render pass.
export const getSessionUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: true },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
});

// Use in pages and Server Actions: the current user, or redirect to login.
export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireUserId(): Promise<string> {
  return (await requireUser()).id;
}

// Occasionally prune expired sessions so the table doesn't grow forever.
export async function pruneExpiredSessions() {
  await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
