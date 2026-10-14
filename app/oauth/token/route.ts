// Token endpoint: an approval code (with its PKCE verifier) or a refresh
// token in, new tokens out. Errors as RFC 6749 says.
import { exchangeCode, refreshTokens } from "@/lib/oauth";

const noStore = { "Cache-Control": "no-store" };
const fail = (error: string, status = 400) => Response.json({ error }, { status, headers: noStore });

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("invalid_request");
  }
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v ? v : undefined;
  };

  const grant = get("grant_type");
  let tokens;
  if (grant === "authorization_code") {
    tokens = await exchangeCode({
      code: get("code"),
      clientId: get("client_id"),
      redirectUri: get("redirect_uri"),
      verifier: get("code_verifier"),
    });
  } else if (grant === "refresh_token") {
    tokens = await refreshTokens({ refreshToken: get("refresh_token"), clientId: get("client_id") });
  } else {
    return fail("unsupported_grant_type");
  }
  if (!tokens) return fail("invalid_grant");
  return Response.json(tokens, { headers: noStore });
}
