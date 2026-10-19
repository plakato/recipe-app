// Signing in with Google or Facebook: the standard OAuth authorization-code
// flow (with PKCE where the provider supports it), done by hand —
// /api/auth/social/<provider> sends people to the provider, …/callback comes
// back with a code, which we exchange for the person's id, e-mail and name.
// A provider shows up on the login page only when its keys are in .env
// (GOOGLE_CLIENT_ID/_SECRET, FACEBOOK_APP_ID/_SECRET). Server-only.
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type Provider = "google" | "facebook";
export const PROVIDERS: Provider[] = ["google", "facebook"];

const FB = "https://graph.facebook.com/v24.0";

type Config = {
  label: string;
  clientId?: string;
  clientSecret?: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  pkce: boolean;
};

function config(p: Provider): Config {
  return p === "google"
    ? {
        label: "Google",
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        tokenUrl: "https://oauth2.googleapis.com/token",
        scope: "openid email profile",
        pkce: true,
      }
    : {
        label: "Facebook",
        clientId: process.env.FACEBOOK_APP_ID,
        clientSecret: process.env.FACEBOOK_APP_SECRET,
        authorizeUrl: "https://www.facebook.com/v24.0/dialog/oauth",
        tokenUrl: `${FB}/oauth/access_token`,
        scope: "email public_profile",
        pkce: false,
      };
}

export const isProvider = (v: string): v is Provider => (PROVIDERS as string[]).includes(v);

// The providers with keys configured, for the login and sign-up pages.
export function enabledProviders(): { id: Provider; label: string }[] {
  return PROVIDERS.filter((p) => config(p).clientId && config(p).clientSecret).map((id) => ({
    id,
    label: config(id).label,
  }));
}

export const callbackUrl = (origin: string, p: Provider) => `${origin}/api/auth/social/${p}/callback`;

// What we remember between leaving for the provider and coming back, in a
// short-lived httpOnly cookie: the anti-forgery state, the PKCE verifier and
// where to go afterwards.
export const FLOW_COOKIE = "social_flow";
export type Flow = { provider: Provider; state: string; verifier: string; next: string };

export function startFlow(p: Provider, origin: string, next: string): { url: string; flow: Flow } | null {
  const c = config(p);
  if (!c.clientId || !c.clientSecret) return null;
  const flow: Flow = {
    provider: p,
    state: randomBytes(16).toString("base64url"),
    verifier: randomBytes(32).toString("base64url"),
    next,
  };
  const url = new URL(c.authorizeUrl);
  url.searchParams.set("client_id", c.clientId);
  url.searchParams.set("redirect_uri", callbackUrl(origin, p));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", c.scope);
  url.searchParams.set("state", flow.state);
  if (c.pkce) {
    url.searchParams.set("code_challenge", createHash("sha256").update(flow.verifier).digest("base64url"));
    url.searchParams.set("code_challenge_method", "S256");
  }
  if (p === "google") url.searchParams.set("prompt", "select_account");
  return { url: url.toString(), flow };
}

export function parseFlow(raw: string | undefined): Flow | null {
  if (!raw) return null;
  try {
    const f = JSON.parse(raw);
    if (isProvider(f.provider) && typeof f.state === "string" && typeof f.verifier === "string" && typeof f.next === "string") {
      return f;
    }
  } catch {}
  return null;
}

export type Profile = { id: string; email: string | null; emailVerified: boolean; name: string | null };

// Code → the person's profile at the provider, or null.
export async function fetchProfile(p: Provider, code: string, flow: Flow, origin: string): Promise<Profile | null> {
  const c = config(p);
  if (!c.clientId || !c.clientSecret) return null;
  const body = new URLSearchParams({
    client_id: c.clientId,
    client_secret: c.clientSecret,
    code,
    redirect_uri: callbackUrl(origin, p),
    grant_type: "authorization_code",
    ...(c.pkce ? { code_verifier: flow.verifier } : {}),
  });
  const tokenRes = await fetch(c.tokenUrl, { method: "POST", body, signal: AbortSignal.timeout(10_000) });
  if (!tokenRes.ok) {
    console.warn(`${p} sign-in: token exchange failed (${tokenRes.status})`);
    return null;
  }
  const accessToken = (await tokenRes.json()).access_token;
  if (typeof accessToken !== "string") return null;

  const auth = { headers: { Authorization: `Bearer ${accessToken}` }, signal: AbortSignal.timeout(10_000) };
  if (p === "google") {
    const r = await fetch("https://openidconnect.googleapis.com/v1/userinfo", auth);
    if (!r.ok) return null;
    const u = await r.json();
    if (typeof u.sub !== "string") return null;
    return {
      id: u.sub,
      email: typeof u.email === "string" ? u.email : null,
      emailVerified: u.email_verified === true,
      name: typeof u.name === "string" ? u.name : null,
    };
  }
  const r = await fetch(`${FB}/me?fields=id,name,email`, auth);
  if (!r.ok) return null;
  const u = await r.json();
  if (typeof u.id !== "string") return null;
  // Facebook doesn't say whether the e-mail is confirmed, so it never opens
  // an existing account by e-mail — only one it created or was linked to.
  return { id: u.id, email: typeof u.email === "string" ? u.email : null, emailVerified: false, name: u.name ?? null };
}

// Which of our accounts this provider identity is, if any: linked before, or
// an account with the same e-mail — only when the provider vouches for that
// e-mail, so nobody can take over an account with someone else's address.
export async function findLinkedUser(p: Provider, profile: Profile, email: string | null) {
  const link = await prisma.socialLogin.findUnique({
    where: { provider_providerAccountId: { provider: p, providerAccountId: profile.id } },
    include: { user: true },
  });
  if (link) return { user: link.user, linked: true };
  if (!email || !profile.emailVerified) return null;
  const user = await prisma.user.findUnique({ where: { email } });
  return user && !user.isGuest ? { user, linked: false } : null;
}

export async function linkLogin(p: Provider, profile: Profile, userId: string) {
  await prisma.socialLogin.create({ data: { provider: p, providerAccountId: profile.id, userId } });
}
