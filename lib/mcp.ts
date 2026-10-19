// A small MCP server (Streamable HTTP, stateless, JSON responses only) for
// app/mcp/route.ts: just enough JSON-RPC for initialize, ping, tools/list and
// tools/call. No sessions and no server-sent events — every request stands
// alone, which is all a read-only recipe search needs.
import type { ToolDef, ToolResult } from "@/lib/mcpTools";

export const PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"];

export const INSTRUCTIONS =
  "This app (Receptík) holds the user's own recipe collection. When the user asks what to cook, choose from " +
  "these recipes rather than inventing one: call list_recipes (with a query when they name ingredients), " +
  "then get_recipes for the likely candidates to check time, servings and how long the dish keeps. " +
  "Suggest one or a few, with the recipe link. You may adapt a recipe slightly so it uses ingredients the " +
  "user mentions, if it will still taste good — say clearly what you changed. Answer in the user's " +
  "language; recipe texts may be Slovak, Czech or English.";

type Message = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
export type Reply = { jsonrpc: "2.0"; id: string | number | null; result?: unknown; error?: { code: number; message: string } };

export type Tools = {
  list: ToolDef[];
  call: (name: string, args: Record<string, unknown>) => Promise<ToolResult>;
};

const ok = (id: Message["id"], result: unknown): Reply => ({ jsonrpc: "2.0", id: id ?? null, result });
const err = (id: Message["id"], code: number, message: string): Reply => ({
  jsonrpc: "2.0",
  id: id ?? null,
  error: { code, message },
});

// One JSON-RPC message → its reply, or null for a notification (no id).
export async function handleMessage(msg: Message, tools: Tools): Promise<Reply | null> {
  if (!msg || typeof msg !== "object" || typeof msg.method !== "string") {
    return err(msg?.id, -32600, "Invalid request");
  }
  if (msg.id === undefined) return null;
  const params = msg.params ?? {};

  switch (msg.method) {
    case "initialize": {
      const asked = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      return ok(msg.id, {
        protocolVersion: PROTOCOL_VERSIONS.includes(asked) ? asked : PROTOCOL_VERSIONS[0],
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "receptik", title: "Receptík", version: "1.0.0" },
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return ok(msg.id, {});
    case "tools/list":
      return ok(msg.id, { tools: tools.list });
    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      if (!tools.list.some((t) => t.name === name)) return err(msg.id, -32602, `Unknown tool: ${name}`);
      const args = params.arguments && typeof params.arguments === "object" ? (params.arguments as Record<string, unknown>) : {};
      const r = await tools.call(name, args);
      return ok(msg.id, {
        content: [{ type: "text", text: r.text }],
        structuredContent: r.structuredContent,
        isError: r.isError ?? false,
      });
    }
    default:
      return err(msg.id, -32601, `Method not found: ${msg.method}`);
  }
}
