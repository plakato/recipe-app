// Outbound fetch that refuses to talk to private/internal addresses.
//
// URL import and image download fetch addresses chosen by the user (or by a
// page the user chose). Without this guard a logged-in user could make the
// server request things only the server can reach: cloud metadata endpoints,
// localhost-only services, other machines on the Tailscale network. We resolve
// the hostname first and reject non-public addresses, and we follow redirects
// by hand so a public site can't bounce us to an internal one.
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_REDIRECTS = 5;

function ipv4ToInt(ip: string): number {
  return ip.split(".").reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
}

function inRange(ip: number, cidr: string): boolean {
  const [base, bits] = cidr.split("/");
  const mask = bits === "0" ? 0 : (~0 << (32 - Number(bits))) >>> 0;
  return (ip & mask) === (ipv4ToInt(base) & mask);
}

const PRIVATE_V4 = [
  "0.0.0.0/8", // "this" network
  "10.0.0.0/8", // private
  "100.64.0.0/10", // carrier-grade NAT — includes Tailscale's 100.x addresses
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local, incl. cloud metadata 169.254.169.254
  "172.16.0.0/12", // private
  "192.0.0.0/24", // IETF protocol assignments
  "192.168.0.0/16", // private
  "198.18.0.0/15", // benchmarking
  "224.0.0.0/3", // multicast + reserved + broadcast
];

// True for loopback, private, link-local, CGNAT/Tailscale, multicast, etc.
export function isPrivateAddress(ip: string): boolean {
  const family = isIP(ip);
  if (family === 4) {
    const n = ipv4ToInt(ip);
    return PRIVATE_V4.some((cidr) => inRange(n, cidr));
  }
  if (family === 6) {
    const lower = ip.toLowerCase();
    // IPv4 mapped/compatible: ::ffff:1.2.3.4 — judge the embedded IPv4.
    const mapped = lower.match(/^(?:::ffff:|::)(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateAddress(mapped[1]);
    if (lower === "::" || lower === "::1") return true;
    if (/^f[cd]/.test(lower)) return true; // fc00::/7 unique local
    if (/^fe[89ab]/.test(lower)) return true; // fe80::/10 link-local
    if (/^ff/.test(lower)) return true; // multicast
    return false;
  }
  return true; // not an IP at all — treat as unsafe
}

// Throws if the URL's host resolves (in whole or part) to a private address.
export async function assertPublicUrl(url: URL): Promise<void> {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("That address isn't reachable from here.");
  }
  const addresses = isIP(host)
    ? [{ address: host }]
    : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) {
    throw new Error("Could not resolve that address.");
  }
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("That address isn't reachable from here.");
  }
}

// fetch() that checks every hop (initial URL and each redirect target).
export async function safeFetch(input: string | URL, init: RequestInit = {}): Promise<Response> {
  let url = new URL(input);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicUrl(url);
    const res = await fetch(url, { ...init, redirect: "manual" });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      url = new URL(location, url);
      continue;
    }
    return res;
  }
  throw new Error("Too many redirects.");
}
