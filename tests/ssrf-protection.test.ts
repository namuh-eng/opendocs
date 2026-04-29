import { describe, expect, it, vi } from "vitest";

const lookupMock = vi.fn(async (hostname: string) => {
  const map: Record<string, Array<{ address: string; family: number }>> = {
    "metadata.google.internal": [{ address: "169.254.169.254", family: 4 }],
    "internal.example.com": [{ address: "10.0.0.2", family: 4 }],
    "public.example.com": [{ address: "93.184.216.34", family: 4 }],
  };
  return map[hostname] ?? [{ address: "93.184.216.34", family: 4 }];
});

vi.mock("node:dns/promises", () => ({
  default: { lookup: lookupMock },
  lookup: lookupMock,
}));

describe("SSRF protection", () => {
  it("blocks metadata service IPs", async () => {
    const { assertSafeProxyUrl } = await import("@/lib/ssrf-protection");
    await expect(
      assertSafeProxyUrl(new URL("http://169.254.169.254/latest/meta-data")),
    ).rejects.toThrow("internal");
  });

  it("blocks hostnames that resolve to private IPs", async () => {
    const { assertSafeProxyUrl } = await import("@/lib/ssrf-protection");
    await expect(
      assertSafeProxyUrl(new URL("https://internal.example.com/resource")),
    ).rejects.toThrow("internal");
  });

  it("allows public HTTP(S) targets", async () => {
    const { assertSafeProxyUrl } = await import("@/lib/ssrf-protection");
    await expect(
      assertSafeProxyUrl(new URL("https://public.example.com/resource")),
    ).resolves.toBeUndefined();
  });
});
