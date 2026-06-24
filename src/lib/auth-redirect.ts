export function resolveSafeReturnTo(
  value: string | string[] | undefined,
  fallback: string,
) {
  const candidate = Array.isArray(value) ? value[0] : value;

  if (!candidate?.startsWith("/") || candidate.startsWith("//")) {
    return fallback;
  }

  if (candidate === "/login" || candidate === "/signup") {
    return fallback;
  }

  return candidate;
}
