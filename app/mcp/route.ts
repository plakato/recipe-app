// The MCP endpoint ChatGPT talks to (lib/mcp.ts). Every request needs an
// access token from our OAuth sign-in (lib/oauth.ts); without one the 401
// tells the app where to sign in.
import { siteUrl } from "@/lib/auth-forms";
import { handleMessage, type Reply } from "@/lib/mcp";
import { callTool, TOOLS } from "@/lib/mcpTools";
import { oauthUrls, userForAccessToken } from "@/lib/oauth";

export async function POST(request: Request) {
  const origin = siteUrl(request, "/").origin;
  const userId = await userForAccessToken(request.headers.get("authorization"));
  if (!userId) {
    return new Response(JSON.stringify({ error: "invalid_token" }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${oauthUrls(origin).resourceMetadata}"`,
      },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  }
  const tools = { list: TOOLS, call: (name: string, args: Record<string, unknown>) => callTool(name, args, userId, origin) };
  const messages = Array.isArray(body) ? body : [body];
  const replies = (await Promise.all(messages.map((m) => handleMessage(m, tools)))).filter((r): r is Reply => r !== null);
  if (!replies.length) return new Response(null, { status: 202 });
  return Response.json(Array.isArray(body) ? replies : replies[0]);
}

// No server-sent event stream: this server never sends anything unasked.
export function GET() {
  return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
}
