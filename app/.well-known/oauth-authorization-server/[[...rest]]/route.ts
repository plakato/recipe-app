// What our sign-in for MCP apps supports (RFC 8414); see lib/oauth.ts.
import { siteUrl } from "@/lib/auth-forms";
import { oauthUrls } from "@/lib/oauth";

export function GET(request: Request) {
  const u = oauthUrls(siteUrl(request, "/").origin);
  return Response.json({
    issuer: u.issuer,
    authorization_endpoint: u.authorize,
    token_endpoint: u.token,
    registration_endpoint: u.register,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
}
