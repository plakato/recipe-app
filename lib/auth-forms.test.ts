import { describe, it, expect } from "vitest";
import { isSameOrigin, safeNext, siteUrl } from "@/lib/auth-forms";

const req = (headers: Record<string, string>, url = "http://localhost:3100/api/auth/login") =>
  new Request(url, { method: "POST", headers });

describe("siteUrl", () => {
  it("uses the Host header, not the server's listen address", () => {
    expect(siteUrl(req({ host: "recepty.brezinovi.sk" }), "/login?error=x").href).toBe(
      "https://recepty.brezinovi.sk/login?error=x",
    );
  });
  it("prefers x-forwarded-host/proto when a proxy sets them", () => {
    expect(siteUrl(req({ host: "127.0.0.1:3100", "x-forwarded-host": "recepty.brezinovi.sk", "x-forwarded-proto": "https" }), "/").href)
      .toBe("https://recepty.brezinovi.sk/");
  });
  it("keeps http for local development", () => {
    expect(siteUrl(req({ host: "localhost:3000" }), "/trash").href).toBe("http://localhost:3000/trash");
  });
});

describe("isSameOrigin", () => {
  it("accepts a matching Origin and rejects a foreign one", () => {
    expect(isSameOrigin(req({ host: "recepty.brezinovi.sk", origin: "https://recepty.brezinovi.sk" }))).toBe(true);
    expect(isSameOrigin(req({ host: "recepty.brezinovi.sk", origin: "https://evil.example" }))).toBe(false);
  });
  it("allows requests without an Origin header", () => {
    expect(isSameOrigin(req({ host: "recepty.brezinovi.sk" }))).toBe(true);
  });
});

describe("safeNext", () => {
  it("only allows same-site relative paths", () => {
    expect(safeNext("/trash")).toBe("/trash");
    expect(safeNext("//evil.example")).toBe("/");
    expect(safeNext("https://evil.example")).toBe("/");
    expect(safeNext("")).toBe("/");
  });
});
