import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enabledProviders, parseFlow, startFlow } from "./socialLogin";

describe("social sign-in", () => {
  beforeEach(() => {
    vi.stubEnv("GOOGLE_CLIENT_ID", "gid");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "gsecret");
    vi.stubEnv("FACEBOOK_APP_ID", "");
    vi.stubEnv("FACEBOOK_APP_SECRET", "");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("offers only providers with keys", () => {
    expect(enabledProviders().map((p) => p.id)).toEqual(["google"]);
    expect(startFlow("facebook", "https://x.example", "/")).toBeNull();
  });

  it("sends Google our callback, a state and a PKCE challenge — never the secret", () => {
    const start = startFlow("google", "https://x.example", "/recipes/1")!;
    const url = new URL(start.url);
    expect(url.origin).toBe("https://accounts.google.com");
    expect(url.searchParams.get("redirect_uri")).toBe("https://x.example/api/auth/social/google/callback");
    expect(url.searchParams.get("state")).toBe(start.flow.state);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(start.url).not.toContain("gsecret");
    expect(start.flow.next).toBe("/recipes/1");
  });

  it("reads back only a well-formed flow cookie", () => {
    const { flow } = startFlow("google", "https://x.example", "/")!;
    expect(parseFlow(JSON.stringify(flow))).toEqual(flow);
    expect(parseFlow("{")).toBeNull();
    expect(parseFlow(JSON.stringify({ ...flow, provider: "myspace" }))).toBeNull();
    expect(parseFlow(undefined)).toBeNull();
  });
});
