import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

function ipv4ToNumber(ip: string) {
  return ip.split(".").reduce((acc, part) => acc * 256 + Number(part), 0) >>> 0;
}

function isPrivateIPv4(ip: string) {
  const value = ipv4ToNumber(ip);
  const ranges: Array<[string, string]> = [
    ["0.0.0.0", "0.255.255.255"],
    ["10.0.0.0", "10.255.255.255"],
    ["127.0.0.0", "127.255.255.255"],
    ["169.254.0.0", "169.254.255.255"],
    ["172.16.0.0", "172.31.255.255"],
    ["192.0.0.0", "192.0.0.255"],
    ["192.168.0.0", "192.168.255.255"],
    ["198.18.0.0", "198.19.255.255"],
    ["224.0.0.0", "255.255.255.255"],
  ];
  return ranges.some(
    ([start, end]) =>
      value >= ipv4ToNumber(start) && value <= ipv4ToNumber(end),
  );
}

function isPrivateIPv6(ip: string) {
  const normalized = ip.toLowerCase();
  return (
    normalized === "::" ||
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("ff")
  );
}

export function isBlockedAddress(address: string) {
  const type = isIP(address);
  if (type === 4) return isPrivateIPv4(address);
  if (type === 6) return isPrivateIPv6(address);
  return false;
}

export async function assertSafeProxyUrl(url: URL) {
  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("Only HTTP(S) URLs are allowed");
  }

  const hostname = url.hostname.toLowerCase();
  if (
    isBlockedAddress(hostname) ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    throw new Error("Requests to internal addresses are not allowed");
  }

  const allowedHosts = (process.env.DOCS_PROXY_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  if (allowedHosts.length === 0 && process.env.NODE_ENV === "production") {
    throw new Error("DOCS_PROXY_ALLOWED_HOSTS is required in production");
  }
  if (allowedHosts.length > 0 && !allowedHosts.includes(hostname)) {
    throw new Error("Requests to this host are not allowed");
  }

  const resolved = await lookup(hostname, { all: true, verbatim: true });
  if (
    resolved.length === 0 ||
    resolved.some((entry) => isBlockedAddress(entry.address))
  ) {
    throw new Error("Requests to internal addresses are not allowed");
  }
}
