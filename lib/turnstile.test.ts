import { afterEach, describe, expect, it, vi } from "vitest";
import { turnstileVerdict, verifyTurnstile } from "@/lib/turnstile";

describe("turnstileVerdict", () => {
  const ok = { success: true, action: "signup", hostname: "recepty.brezinovi.sk" };
  const hosts = ["recepty.brezinovi.sk"];

  it("accepts a passed token made for this form on this site", () => {
    expect(turnstileVerdict(ok, "signup", hosts)).toBe(true);
  });

  it("refuses failures, other forms and other sites (incl. localhost on the live site)", () => {
    expect(turnstileVerdict({ ...ok, success: false }, "signup", hosts)).toBe(false);
    expect(turnstileVerdict(ok, "demo", hosts)).toBe(false);
    expect(turnstileVerdict({ ...ok, hostname: "localhost" }, "signup", hosts)).toBe(false);
    expect(turnstileVerdict({ ...ok, hostname: undefined }, "signup", hosts)).toBe(false);
  });
});

describe("verifyTurnstile", () => {
  const ctx = { ip: "203.0.113.5", host: "localhost:3000" };
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  const on = () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "1x00000000000000000000BB");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
  };
  const cloudflareSays = (body: object) =>
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(body))));

  it("lets everything through when Turnstile isn't configured", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(await verifyTurnstile(null, "signup", ctx)).toBe(true);
  });

  it("with Cloudflare's test keys, only success counts (they send no action, host example.com)", async () => {
    on();
    cloudflareSays({ success: true, hostname: "example.com" });
    expect(await verifyTurnstile("XXXX.DUMMY.TOKEN.XXXX", "demo", ctx)).toBe(true);
    const sent = vi.mocked(fetch).mock.calls[0][1]!.body as URLSearchParams;
    expect(sent.get("response")).toBe("XXXX.DUMMY.TOKEN.XXXX");
    expect(sent.get("remoteip")).toBe("203.0.113.5");
  });

  it("with real keys, checks the form and this site's host", async () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "0x4AAAAAAA-real");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "0x4AAAAAAA-real-secret");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    cloudflareSays({ success: true, action: "demo", hostname: "localhost" });
    expect(await verifyTurnstile("t", "demo", ctx)).toBe(true);
    cloudflareSays({ success: true, action: "signup", hostname: "localhost" });
    expect(await verifyTurnstile("t", "demo", ctx)).toBe(false);
    cloudflareSays({ success: true, action: "demo", hostname: "example.com" });
    expect(await verifyTurnstile("t", "demo", ctx)).toBe(false);
  });

  it("refuses a missing token without asking Cloudflare", async () => {
    on();
    cloudflareSays({ success: true });
    expect(await verifyTurnstile(null, "signup", ctx)).toBe(false);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails closed when Cloudflare can't be reached", async () => {
    on();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(await verifyTurnstile("token", "signup", ctx)).toBe(false);
  });
});
