export function getPublicAppUrl() {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_APP_URL is required in production");
  }
  return "http://localhost:3015";
}

function firstForwardedValue(value: string | null): string | null {
  return value?.split(",")[0]?.trim() || null;
}

/** Build the app origin for the current request, preferring proxy headers. */
export function getRequestAppUrl(headers: Headers) {
  const forwardedHost = firstForwardedValue(headers.get("x-forwarded-host"));
  const host = forwardedHost ?? headers.get("host")?.trim();

  if (!host) return getPublicAppUrl();

  const forwardedProto = firstForwardedValue(headers.get("x-forwarded-proto"));
  const protocol =
    forwardedProto ??
    (host.startsWith("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");

  return `${protocol}://${host}`.replace(/\/+$/, "");
}
