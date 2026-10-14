import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { checkAuthorize, isAllowedRedirectUri, pkceMatches } from "./oauth";

describe("isAllowedRedirectUri", () => {
  it("allows https, and http only to this computer", () => {
    expect(isAllowedRedirectUri("https://chatgpt.com/connector_platform_oauth_redirect")).toBe(true);
    expect(isAllowedRedirectUri("http://localhost:6274/oauth/callback")).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1/cb")).toBe(true);
    expect(isAllowedRedirectUri("http://evil.example/cb")).toBe(false);
  });

  it("refuses other schemes, fragments and junk", () => {
    expect(isAllowedRedirectUri("javascript:alert(1)")).toBe(false);
    expect(isAllowedRedirectUri("https://x.example/cb#frag")).toBe(false);
    expect(isAllowedRedirectUri("not a url")).toBe(false);
    expect(isAllowedRedirectUri(42)).toBe(false);
  });
});

describe("pkceMatches", () => {
  const verifier = "a".repeat(43);
  const challenge = createHash("sha256").update(verifier).digest("base64url");

  it("accepts the verifier that hashes to the challenge", () => {
    expect(pkceMatches(verifier, challenge)).toBe(true);
  });

  it("refuses a wrong or malformed verifier", () => {
    expect(pkceMatches("b".repeat(43), challenge)).toBe(false);
    expect(pkceMatches("short", createHash("sha256").update("short").digest("base64url"))).toBe(false);
  });
});

describe("checkAuthorize", () => {
  const client = { id: "c1", redirectUris: ["https://chatgpt.com/cb"] };
  const resource = "https://recepty.example/mcp";
  const good = {
    client_id: "c1",
    redirect_uri: "https://chatgpt.com/cb",
    response_type: "code",
    code_challenge: "x".repeat(43),
    code_challenge_method: "S256",
    state: "s",
    resource,
  };

  it("passes a proper request", () => {
    expect(checkAuthorize(good, client, resource)).toEqual({
      ok: { clientId: "c1", redirectUri: "https://chatgpt.com/cb", state: "s", codeChallenge: "x".repeat(43) },
    });
  });

  it("never redirects to an unknown app or unregistered address", () => {
    expect(checkAuthorize(good, null, resource)).toHaveProperty("fatal");
    expect(checkAuthorize({ ...good, redirect_uri: "https://evil.example/cb" }, client, resource)).toHaveProperty("fatal");
  });

  it("sends other problems back to the app", () => {
    expect(checkAuthorize({ ...good, code_challenge_method: "plain" }, client, resource)).toMatchObject({
      redirectError: "invalid_request",
    });
    expect(checkAuthorize({ ...good, response_type: "token" }, client, resource)).toMatchObject({
      redirectError: "unsupported_response_type",
    });
    expect(checkAuthorize({ ...good, resource: "https://other.example/mcp" }, client, resource)).toMatchObject({
      redirectError: "invalid_target",
    });
  });
});
