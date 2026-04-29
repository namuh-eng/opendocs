import { isIP } from "node:net";

function normalizeIp(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const bracketedIpv6 = trimmed.match(/^\[([^\]]+)\](?::\d+)?$/);
  if (bracketedIpv6?.[1] && isIP(bracketedIpv6[1])) return bracketedIpv6[1];

  const ipv4WithPort = trimmed.match(/^(\d{1,3}(?:\.\d{1,3}){3})(?::\d+)?$/);
  if (ipv4WithPort?.[1] && isIP(ipv4WithPort[1])) return ipv4WithPort[1];

  return isIP(trimmed) ? trimmed : null;
}

function firstForwardedFor(value: string) {
  return value
    .split(",")
    .map((part) => normalizeIp(part))
    .find((part): part is string => Boolean(part));
}

export function getClientRateLimitKey(
  headers: Headers,
  namespace: string,
  fallback = "unknown",
) {
  const candidates = [
    headers.get("cf-connecting-ip"),
    headers.get("fly-client-ip"),
    headers.get("x-real-ip"),
    headers.get("x-forwarded-for"),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    const normalized = candidate.includes(",")
      ? firstForwardedFor(candidate)
      : normalizeIp(candidate);
    if (normalized) return `${namespace}:ip:${normalized}`;
  }

  return `${namespace}:ip:${fallback}`;
}
