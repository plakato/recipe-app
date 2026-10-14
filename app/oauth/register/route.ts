// Dynamic client registration (RFC 7591): ChatGPT registers itself here the
// first time someone connects the app. Public clients only (PKCE, no secret).
import { isAllowedRedirectUri, registerClient } from "@/lib/oauth";

// At most this many registrations per IP an hour, so nobody fills the table.
const LIMIT = 20;
const recent = new Map<string, number[]>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < 60 * 60 * 1000);
  times.push(now);
  recent.set(ip, times);
  return times.length > LIMIT;
}

const fail = (error_description: string) =>
  Response.json({ error: "invalid_client_metadata", error_description }, { status: 400 });

export async function POST(request: Request) {
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for") ?? "local";
  if (tooMany(ip)) return Response.json({ error: "temporarily_unavailable" }, { status: 429 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return fail("Body must be JSON.");
  }
  const uris = body.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > 10 || !uris.every(isAllowedRedirectUri)) {
    return fail("redirect_uris must be 1–10 https (or localhost) URLs.");
  }
  const method = body.token_endpoint_auth_method ?? "none";
  if (method !== "none") return fail("Only public clients (token_endpoint_auth_method none) are supported.");
  const name = typeof body.client_name === "string" ? body.client_name.slice(0, 100) : null;

  const clientId = await registerClient(name, uris);
  return Response.json(
    {
      client_id: clientId,
      client_id_issued_at: Math.floor(Date.now() / 1000),
      client_name: name ?? undefined,
      redirect_uris: uris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    },
    { status: 201 },
  );
}
