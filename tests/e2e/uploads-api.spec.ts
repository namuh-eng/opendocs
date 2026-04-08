import { expect, test } from "@playwright/test";

test.describe("Uploads presign API", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("POST /api/uploads/presign rejects unauthenticated requests", async ({
    request,
  }) => {
    const response = await request.post("/api/uploads/presign", {
      data: {
        orgId: "test-org",
        projectId: "test-project",
        filename: "logo.png",
        contentType: "image/png",
        size: 128,
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("GET /api/uploads/presign rejects unauthenticated requests", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/uploads/presign?key=test-org/test-project/assets/logo.png",
    );

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("POST /api/uploads/presign rejects missing size", async ({
    request,
  }) => {
    const response = await request.post("/api/uploads/presign", {
      data: {
        orgId: "test-org",
        projectId: "test-project",
        filename: "logo.png",
        contentType: "image/png",
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("POST /api/uploads/presign rejects disallowed content type", async ({
    request,
  }) => {
    const response = await request.post("/api/uploads/presign", {
      data: {
        orgId: "test-org",
        projectId: "test-project",
        filename: "virus.exe",
        contentType: "application/x-msdownload",
        size: 128,
      },
    });

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  test("GET /api/uploads/presign rejects missing key", async ({ request }) => {
    const response = await request.get("/api/uploads/presign");

    expect(response.status()).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });
});
