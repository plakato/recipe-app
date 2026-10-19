// Back from Google/Facebook: check the state, get the person's profile, and
// sign them in — to the account linked before, to the account with the same
// verified e-mail, or to a new one (sign-up limits apply as usual).
import { NextResponse, type NextRequest } from "next/server";
import { createSession, getSessionUser } from "@/lib/auth";
import { redirectWithError, siteUrl } from "@/lib/auth-forms";
import { createAccount } from "@/lib/accounts";
import { clientIp } from "@/lib/clientIp";
import { isValidEmail, normalizeEmail } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { canSignUp } from "@/lib/signupLimits";
import { fetchProfile, findLinkedUser, FLOW_COOKIE, isProvider, linkLogin, parseFlow } from "@/lib/socialLogin";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/auth/social/[provider]/callback">) {
  const { provider } = await ctx.params;
  const q = request.nextUrl.searchParams;
  const flow = parseFlow(request.cookies.get(FLOW_COOKIE)?.value);
  const fail = (error: string) => {
    const res = redirectWithError(request, "/login", error, { next: flow?.next ?? "" });
    res.cookies.delete({ name: FLOW_COOKIE, path: "/api/auth/social" });
    return res;
  };

  if (!isProvider(provider) || !flow || flow.provider !== provider || q.get("state") !== flow.state) {
    return fail("social");
  }
  // They pressed Cancel at the provider.
  if (q.get("error")) return fail("cancelled");
  const code = q.get("code");
  if (!code) return fail("social");

  const origin = siteUrl(request, "/").origin;
  const profile = await fetchProfile(provider, code, flow, origin).catch(() => null);
  if (!profile) return fail("social");
  const email = profile.email ? normalizeEmail(profile.email) : null;

  let user;
  const found = await findLinkedUser(provider, profile, email);
  if (found) {
    user = found.user;
    if (!found.linked) await linkLogin(provider, profile, user.id);
  } else {
    if (!email || !isValidEmail(email)) return fail("noemail");
    // The e-mail belongs to an account we may not open this way (see
    // findLinkedUser): sign in with the password, or Google.
    if (await prisma.user.findUnique({ where: { email } })) return fail("linkexists");
    const ip = await clientIp();
    if (!(await canSignUp(ip))) return fail("limit");
    user = await createAccount({ email, name: profile.name?.slice(0, 80) ?? null, password: null }, await getSessionUser(), ip);
    await linkLogin(provider, profile, user.id);
  }

  const cookie = await createSession(user.id);
  const res = NextResponse.redirect(siteUrl(request, flow.next), 303);
  res.cookies.set(cookie.name, cookie.value, cookie.options);
  res.cookies.delete({ name: FLOW_COOKIE, path: "/api/auth/social" });
  return res;
}
