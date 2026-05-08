import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  select: vi.fn(),
  limit: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: dbMocks.select,
  },
}));

function setupDbChain() {
  const chain = {
    from: vi.fn(() => chain),
    where: vi.fn(() => chain),
    limit: dbMocks.limit,
  };
  dbMocks.select.mockReturnValue(chain);
}

describe("docs page metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDbChain();
  });

  it("uses the standard 404 title when the docs project is missing", async () => {
    dbMocks.limit.mockResolvedValueOnce([]);

    const { generateMetadata } = await import(
      "@/app/docs/[subdomain]/[...slug]/page"
    );

    await expect(
      generateMetadata({
        params: Promise.resolve({
          subdomain: "missing-docs",
          slug: ["does-not-exist"],
        }),
      }),
    ).resolves.toMatchObject({
      title: "404: This page could not be found.",
    });
  });

  it("uses the standard 404 title when a docs page slug is missing", async () => {
    dbMocks.limit
      .mockResolvedValueOnce([
        { id: "project-1", name: "Test Project", settings: {} },
      ])
      .mockResolvedValueOnce([]);

    const { generateMetadata } = await import(
      "@/app/docs/[subdomain]/[...slug]/page"
    );

    await expect(
      generateMetadata({
        params: Promise.resolve({
          subdomain: "test-project",
          slug: ["does-not-exist"],
        }),
      }),
    ).resolves.toMatchObject({
      title: "404: This page could not be found.",
    });
  });
});
