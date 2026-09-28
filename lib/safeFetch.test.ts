import { describe, it, expect } from "vitest";
import { assertPublicUrl, isPrivateAddress } from "@/lib/safeFetch";

describe("isPrivateAddress", () => {
  it("flags loopback, private, link-local, CGNAT/Tailscale, multicast", () => {
    for (const ip of [
      "127.0.0.1", "127.9.9.9", "10.1.2.3", "172.16.0.1", "172.31.255.255",
      "192.168.1.1", "169.254.169.254", "100.87.152.8", "100.64.0.1", "0.0.0.0",
      "224.0.0.1", "255.255.255.255", "::1", "::", "fc00::1", "fd12::1",
      "fe80::1", "ff02::1", "::ffff:127.0.0.1", "::ffff:10.0.0.1",
    ]) {
      expect(isPrivateAddress(ip), ip).toBe(true);
    }
  });
  it("allows public addresses", () => {
    for (const ip of ["8.8.8.8", "1.1.1.1", "172.32.0.1", "100.128.0.1", "93.184.216.34", "2606:4700::1111", "::ffff:8.8.8.8"]) {
      expect(isPrivateAddress(ip), ip).toBe(false);
    }
  });
  it("treats non-IPs as unsafe", () => {
    expect(isPrivateAddress("not-an-ip")).toBe(true);
  });
});

describe("assertPublicUrl", () => {
  it("rejects non-http schemes, localhost names and literal private IPs", async () => {
    await expect(assertPublicUrl(new URL("file:///etc/passwd"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("http://localhost:3000/"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("http://foo.localhost/"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("http://169.254.169.254/latest/meta-data/"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("http://[::1]:8080/"))).rejects.toThrow();
    await expect(assertPublicUrl(new URL("http://100.87.152.8/"))).rejects.toThrow();
  });
  it("accepts a literal public IP without DNS", async () => {
    await expect(assertPublicUrl(new URL("https://1.1.1.1/"))).resolves.toBeUndefined();
  });
});
