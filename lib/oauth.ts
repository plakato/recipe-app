// OAuth 2.1 sign-in for ChatGPT and other MCP apps — the minimum the MCP
// authorization spec asks for: discovery documents (app/.well-known/*),
// dynamic client registration (/oauth/register), the authorization-code flow
// with PKCE S256 only (/oauth/authorize, /oauth/token) and refresh-token
// rotation. Public clients only: no client secrets. Server-only.
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";

export const CODE_TTL_MS = 5 * 60 * 1000;
export const ACCESS_TTL_MS = 60 * 60 * 1000;
export const REFRESH_TTL_MS = 60 * 24 * 60 * 60 * 1000; // 60 days unused

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const newSecret = () => randomBytes(32).toString("base64url");

// The URLs of this site's OAuth pieces, from its origin (https://host).
export function oauthUrls(origin: string) {
  return {
    issuer: origin,
    resource: `${origin}/mcp`,
    authorize: `${origin}/oauth/authorize`,
    token: `${origin}/oauth/token`,
    register: `${origin}/oauth/register`,
    resourceMetadata: `${origin}/.well-known/oauth-protected-resource/mcp`,
  };
}

// --- pure checks (tested in lib/oauth.test.ts) ---

// A redirect URI an app may register: https anywhere, http only to this
// computer (local MCP clients). No fragments, no custom schemes.
export function isAllowedRedirectUri(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2000) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.hash) return false;
  if (url.protocol === "https:") return true;
  return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
}

// PKCE S256: the verifier the app sends with the code must hash to the
// challenge it sent when asking.
export function pkceMatches(verifier: string, challenge: string): boolean {
  if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) return false;
  return createHash("sha256").update(verifier).digest("base64url") === challenge;
}

export type AuthorizeParams = {
  clientId: string;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
};

// The authorize request's parameters, checked against the registered client.
// "fatal" errors must not redirect back (the redirect URI isn't trusted yet);
// the others go back to the app as ?error=.
export function checkAuthorize(
  q: Record<string, string | undefined>,
  client: { id: string; redirectUris: string[] } | null,
  resource: string,
): { ok: AuthorizeParams } | { fatal: string } | { redirectError: string; redirectUri: string; state: string | null } {
  if (!client) return { fatal: "Neznáma aplikácia. Pripojte ju v ChatGPT znova." };
  const redirectUri = q.redirect_uri ?? (client.redirectUris.length === 1 ? client.redirectUris[0] : undefined);
  if (!redirectUri || !client.redirectUris.includes(redirectUri)) {
    return { fatal: "Aplikácia poslala neplatnú spätnú adresu." };
  }
  const state = q.state ?? null;
  const back = (redirectError: string) => ({ redirectError, redirectUri, state });
  if (q.response_type !== "code") return back("unsupported_response_type");
  if (!q.code_challenge || q.code_challenge_method !== "S256") return back("invalid_request");
  if (q.resource && q.resource.replace(/\/$/, "") !== resource) return back("invalid_target");
  return { ok: { clientId: client.id, redirectUri, state, codeChallenge: q.code_challenge } };
}

// --- storage ---

export async function registerClient(name: string | null, redirectUris: string[]) {
  const id = newSecret();
  await prisma.oAuthClient.create({ data: { id, name, redirectUris: JSON.stringify(redirectUris) } });
  return id;
}

export async function findClient(id: string | undefined) {
  if (!id) return null;
  const c = await prisma.oAuthClient.findUnique({ where: { id } });
  if (!c) return null;
  let uris: unknown = [];
  try {
    uris = JSON.parse(c.redirectUris);
  } catch {}
  return { id: c.id, name: c.name, redirectUris: Array.isArray(uris) ? uris.filter((u) => typeof u === "string") : [] };
}

export async function createCode(p: AuthorizeParams, userId: string): Promise<string> {
  const code = newSecret();
  await prisma.oAuthCode.create({
    data: {
      id: sha256(code),
      clientId: p.clientId,
      userId,
      redirectUri: p.redirectUri,
      codeChallenge: p.codeChallenge,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
};

async function issueTokens(clientId: string, userId: string): Promise<TokenResponse> {
  const access = newSecret();
  const refresh = newSecret();
  const now = Date.now();
  await prisma.oAuthToken.createMany({
    data: [
      { id: sha256(access), kind: "access", clientId, userId, expiresAt: new Date(now + ACCESS_TTL_MS) },
      { id: sha256(refresh), kind: "refresh", clientId, userId, expiresAt: new Date(now + REFRESH_TTL_MS) },
    ],
  });
  return { access_token: access, token_type: "Bearer", expires_in: ACCESS_TTL_MS / 1000, refresh_token: refresh };
}

// Code → tokens. The code works once (deleted on first use, even a failed
// one), for the same app, redirect URI and PKCE verifier.
export async function exchangeCode(f: {
  code?: string;
  clientId?: string;
  redirectUri?: string;
  verifier?: string;
}): Promise<TokenResponse | null> {
  if (!f.code || !f.clientId || !f.verifier) return null;
  const id = sha256(f.code);
  const row = await prisma.oAuthCode.findUnique({ where: { id } });
  if (!row) return null;
  await prisma.oAuthCode.delete({ where: { id } }).catch(() => {});
  if (row.expiresAt < new Date() || row.clientId !== f.clientId) return null;
  if (f.redirectUri && f.redirectUri !== row.redirectUri) return null;
  if (!pkceMatches(f.verifier, row.codeChallenge)) return null;
  return issueTokens(row.clientId, row.userId);
}

// Refresh token → new tokens; the old refresh token stops working.
export async function refreshTokens(f: { refreshToken?: string; clientId?: string }): Promise<TokenResponse | null> {
  if (!f.refreshToken) return null;
  const id = sha256(f.refreshToken);
  const row = await prisma.oAuthToken.findUnique({ where: { id } });
  if (!row || row.kind !== "refresh") return null;
  await prisma.oAuthToken.delete({ where: { id } }).catch(() => {});
  if (row.expiresAt < new Date() || (f.clientId && f.clientId !== row.clientId)) return null;
  return issueTokens(row.clientId, row.userId);
}

// The account an access token belongs to, or null.
export async function userForAccessToken(header: string | null): Promise<string | null> {
  const token = header?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return null;
  const row = await prisma.oAuthToken.findUnique({ where: { id: sha256(token) } });
  if (!row || row.kind !== "access" || row.expiresAt < new Date()) return null;
  return row.userId;
}

// Housekeeping: drop expired codes and tokens.
export async function pruneOAuth() {
  const now = new Date();
  await prisma.oAuthCode.deleteMany({ where: { expiresAt: { lt: now } } });
  await prisma.oAuthToken.deleteMany({ where: { expiresAt: { lt: now } } });
}
