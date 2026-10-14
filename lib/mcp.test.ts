import { describe, expect, it } from "vitest";
import { handleMessage, PROTOCOL_VERSIONS, type Tools } from "./mcp";
import { matchCount } from "./mcpTools";

const tools: Tools = {
  list: [{ name: "list_recipes", title: "", description: "", inputSchema: {}, annotations: {} }],
  call: async (name, args) => ({ structuredContent: { name, args }, text: "done" }),
};

describe("handleMessage", () => {
  it("agrees on a protocol version it knows, else offers its newest", async () => {
    const r = await handleMessage({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } }, tools);
    expect(r?.result).toMatchObject({ protocolVersion: "2025-06-18", capabilities: { tools: {} } });
    const r2 = await handleMessage({ jsonrpc: "2.0", id: 2, method: "initialize", params: { protocolVersion: "1999-01-01" } }, tools);
    expect(r2?.result).toMatchObject({ protocolVersion: PROTOCOL_VERSIONS[0] });
  });

  it("answers nothing to notifications", async () => {
    expect(await handleMessage({ jsonrpc: "2.0", method: "notifications/initialized" }, tools)).toBeNull();
  });

  it("lists and calls tools", async () => {
    const list = await handleMessage({ jsonrpc: "2.0", id: 3, method: "tools/list" }, tools);
    expect((list?.result as { tools: unknown[] }).tools).toHaveLength(1);
    const call = await handleMessage(
      { jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "list_recipes", arguments: { query: "tofu" } } },
      tools,
    );
    expect(call?.result).toEqual({
      content: [{ type: "text", text: "done" }],
      structuredContent: { name: "list_recipes", args: { query: "tofu" } },
      isError: false,
    });
  });

  it("refuses unknown tools and methods", async () => {
    const t = await handleMessage({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "drop_db" } }, tools);
    expect(t?.error?.code).toBe(-32602);
    const m = await handleMessage({ jsonrpc: "2.0", id: 6, method: "resources/list" }, tools);
    expect(m?.error?.code).toBe(-32601);
  });
});

describe("matchCount", () => {
  it("finds word stems without minding accents or case", () => {
    expect(matchCount("cibul tofu kur", "Kuracie prsia\n1 cibuľa\nsoľ")).toBe(2);
    expect(matchCount("tofu", "Bábovka")).toBe(0);
  });
});
