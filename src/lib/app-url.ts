function normalizeConfiguredUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

export function getPublicAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return normalizeConfiguredUrl(url);
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  }
  return "http://localhost:3015";
}

function firstForwardedValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

function isLocalhost(hostname: string) {
  return (
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]"
  );
}

function normalizeOrigin(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function buildRequestOrigin(headers: Headers): string | null {
  const forwardedHost = firstForwardedValue(headers.get("x-forwarded-host"));
  const host = forwardedHost ?? headers.get("host")?.trim();

  if (!host) return null;

  const forwardedProto = firstForwardedValue(headers.get("x-forwarded-proto"));
  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https";

  return normalizeOrigin(`${protocol}://${host}`);
}

/**
 * Resolve a same-app origin without trusting arbitrary request Host headers.
 *
 * Production server fetches must not derive their credential-bearing target from
 * x-forwarded-host/host. Only the configured app URL is trusted there. In local
 * development, localhost request ports are allowed so multiple dev servers can
 * call their own route handlers without rewriting NEXT_PUBLIC_APP_URL.
 */
export function getRequestAppUrl(headers: Headers) {
  const configuredUrl = getPublicAppUrl();
  const configuredOrigin = normalizeOrigin(configuredUrl) ?? configuredUrl;
  const requestOrigin = buildRequestOrigin(headers);

  if (!requestOrigin) return configuredUrl;
  if (requestOrigin === configuredOrigin) return requestOrigin;

  if (process.env.NODE_ENV !== "production") {
    const parsedRequestOrigin = new URL(requestOrigin);
    if (isLocalhost(parsedRequestOrigin.hostname)) return requestOrigin;
  }

  return configuredUrl;
}
