import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeRequest(body: Record<string, unknown>, headers?: Record<string, string>) {
  const request = new Request("http://localhost:3000/api/webhooks/github", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": "push",
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  }) as NextRequest;

  Object.defineProperty(request, "nextUrl", {
    value: new URL("http://localhost:3000/api/webhooks/github"),
    configurable: true,
  });

  return request;
}

const selectMock = vi.fn();
const insertMock = vi.fn();
const updateMock = vi.fn();

vi.mock("@/lib/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    update: updateMock,
  },
}));

describe("POST /api/webhooks/github", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.GITHUB_WEBHOOK_SECRET;
  });

  it("queues deployment only when installation id matches project githubSource", async () => {
    selectMock
      .mockReturnValueOnce({
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          {
            orgId: "org-1",
            installationId: "inst_123",
            repos: [
              {
                fullName: "namuh-eng/namuh-mintlify",
                branch: "main",
                permissions: "admin",
              },
            ],
            autoUpdateEnabled: true,
          },
        ]),
      })
      .mockReturnValueOnce({
        select: undefined,
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue([
          {
            id: "project-1",
            repoUrl: "https://github.com/namuh-eng/namuh-mintlify",
            repoBranch: "main",
            repoPath: "/",
            settings: {
              githubSource: {
                repoFullName: "namuh-eng/namuh-mintlify",
                owner: "namuh-eng",
                repo: "namuh-mintlify",
                installationId: "inst_123",
                branch: "main",
                path: "/",
                sourceType: "connected_repo",
              },
            },
          },
          {
            id: "project-2",
            repoUrl: "https://github.com/namuh-eng/namuh-mintlify",
            repoBranch: "main",
            repoPath: "/",
            settings: {
              githubSource: {
                repoFullName: "namuh-eng/namuh-mintlify",
                owner: "namuh-eng",
                repo: "namuh-mintlify",
                installationId: "inst_other",
                branch: "main",
                path: "/",
                sourceType: "connected_repo",
              },
            },
          },
        ]),
      });

    const insertValuesMock = vi.fn().mockResolvedValue(undefined);
    insertMock.mockReturnValue({ values: insertValuesMock });

    const updateWhereMock = vi.fn().mockResolvedValue(undefined);
    const updateSetMock = vi.fn().mockReturnValue({ where: updateWhereMock });
    updateMock.mockReturnValue({ set: updateSetMock });

    const { POST } = await import("@/app/api/webhooks/github/route");
    const response = await POST(
      makeRequest(
        {
          ref: "refs/heads/main",
          after: "abc123def456",
          repository: { full_name: "namuh-eng/namuh-mintlify" },
          head_commit: { message: "Update docs", id: "abc123def456" },
          installation: { id: 123 },
        },
        { "x-github-hook-installation-target-id": "123" },
      ),
    );

    expect(response.status).toBe(200);
    expect(insertValuesMock).toHaveBeenCalledTimes(1);
    expect(insertValuesMock).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: "project-1" }),
    );
    expect(updateWhereMock).toHaveBeenCalledTimes(1);
  });
});
