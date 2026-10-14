// Where an MCP app learns who signs people in for /mcp (RFC 9728). Served at
// /.well-known/oauth-protected-resource and …/mcp, since clients try both.
import { siteUrl } from "@/lib/auth-forms";
import { oauthUrls } from "@/lib/oauth";

export function GET(request: Request) {
  const u = oauthUrls(siteUrl(request, "/").origin);
  return Response.json({
    resource: u.resource,
    authorization_servers: [u.issuer],
    bearer_methods_supported: ["header"],
    resource_name: "Rodinné recepty",
  });
}
