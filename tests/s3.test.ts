import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the AWS SDK clients before importing our module
const mockSend = vi.fn();
vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({
      ...input,
      _type: "PutObjectCommand",
    })),
    GetObjectCommand: vi.fn().mockImplementation((input) => ({
      ...input,
      _type: "GetObjectCommand",
    })),
    DeleteObjectCommand: vi.fn().mockImplementation((input) => ({
      ...input,
      _type: "DeleteObjectCommand",
    })),
    HeadObjectCommand: vi.fn().mockImplementation((input) => ({
      ...input,
      _type: "HeadObjectCommand",
    })),
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => {
  return {
    getSignedUrl: vi
      .fn()
      .mockResolvedValue("https://s3.amazonaws.com/presigned-url"),
  };
});

// Set env before importing module
vi.stubEnv("S3_BUCKET", "test-bucket");
vi.stubEnv("AWS_REGION", "us-east-1");

describe("S3 utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildS3Key", () => {
    it("constructs key with orgId/projectId/assets prefix", async () => {
      const { buildS3Key } = await import("@/lib/s3");
      const key = buildS3Key("org-123", "proj-456", "logo.png");
      expect(key).toBe("org-123/proj-456/assets/logo.png");
    });

    it("handles nested file paths", async () => {
      const { buildS3Key } = await import("@/lib/s3");
      const key = buildS3Key("org-123", "proj-456", "images/hero.jpg");
      expect(key).toBe("org-123/proj-456/assets/images/hero.jpg");
    });

    it("strips leading slashes from filename", async () => {
      const { buildS3Key } = await import("@/lib/s3");
      const key = buildS3Key("org-123", "proj-456", "/logo.png");
      expect(key).toBe("org-123/proj-456/assets/logo.png");
    });
  });

  describe("getUploadPresignedUrl", () => {
    it("returns a presigned URL and the S3 key", async () => {
      const { getUploadPresignedUrl } = await import("@/lib/s3");
      const result = await getUploadPresignedUrl({
        orgId: "org-123",
        projectId: "proj-456",
        filename: "doc.pdf",
        contentType: "application/pdf",
        size: 1024,
      });

      expect(result.url).toBe("https://s3.amazonaws.com/presigned-url");
      expect(result.key).toBe("org-123/proj-456/assets/doc.pdf");
    });

    it("uses correct content type", async () => {
      const { PutObjectCommand } = await import("@aws-sdk/client-s3");
      const { getUploadPresignedUrl } = await import("@/lib/s3");

      await getUploadPresignedUrl({
        orgId: "org-1",
        projectId: "proj-1",
        filename: "image.png",
        contentType: "image/png",
        size: 2048,
      });

      expect(PutObjectCommand).toHaveBeenCalledWith(
        expect.objectContaining({
          Bucket: "test-bucket",
          ContentType: "image/png",
          ContentLength: 2048,
        }),
      );
    });
  });

  describe("getDownloadPresignedUrl", () => {
    it("returns a presigned URL for downloading", async () => {
      const { getDownloadPresignedUrl } = await import("@/lib/s3");
      const url = await getDownloadPresignedUrl(
        "org-123/proj-456/assets/doc.pdf",
      );
      expect(url).toBe("https://s3.amazonaws.com/presigned-url");
    });
  });

  describe("deleteObject", () => {
    it("sends a delete command with the correct key", async () => {
      mockSend.mockResolvedValueOnce({});
      const { deleteObject } = await import("@/lib/s3");
      await deleteObject("org-123/proj-456/assets/old.png");
      expect(mockSend).toHaveBeenCalledTimes(1);
    });
  });

  describe("objectExists", () => {
    it("returns true when object exists", async () => {
      mockSend.mockResolvedValueOnce({});
      const { objectExists } = await import("@/lib/s3");
      const exists = await objectExists("org-123/proj-456/assets/file.txt");
      expect(exists).toBe(true);
    });

    it("returns false when object does not exist", async () => {
      const err = new Error("Not Found");
      err.name = "NotFound";
      mockSend.mockRejectedValueOnce(err);
      const { objectExists } = await import("@/lib/s3");
      const exists = await objectExists("org-123/proj-456/assets/missing.txt");
      expect(exists).toBe(false);
    });
  });

  describe("ALLOWED_CONTENT_TYPES", () => {
    it("includes common image types", async () => {
      const { ALLOWED_CONTENT_TYPES } = await import("@/lib/s3");
      expect(ALLOWED_CONTENT_TYPES).toContain("image/png");
      expect(ALLOWED_CONTENT_TYPES).toContain("image/jpeg");
      expect(ALLOWED_CONTENT_TYPES).toContain("image/svg+xml");
      expect(ALLOWED_CONTENT_TYPES).toContain("image/webp");
      expect(ALLOWED_CONTENT_TYPES).toContain("image/gif");
    });

    it("includes document types", async () => {
      const { ALLOWED_CONTENT_TYPES } = await import("@/lib/s3");
      expect(ALLOWED_CONTENT_TYPES).toContain("application/pdf");
    });

    it("does not include executable types", async () => {
      const { ALLOWED_CONTENT_TYPES } = await import("@/lib/s3");
      expect(ALLOWED_CONTENT_TYPES).not.toContain("application/x-executable");
      expect(ALLOWED_CONTENT_TYPES).not.toContain("application/x-msdownload");
    });
  });

  describe("validateUploadRequest", () => {
    it("rejects missing filename", async () => {
      const { validateUploadRequest } = await import("@/lib/s3");
      const result = validateUploadRequest({
        filename: "",
        contentType: "image/png",
        size: 10,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/filename/i);
    });

    it("rejects disallowed content type", async () => {
      const { validateUploadRequest } = await import("@/lib/s3");
      const result = validateUploadRequest({
        filename: "virus.exe",
        contentType: "application/x-msdownload",
        size: 10,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/content type/i);
    });

    it("accepts valid upload request", async () => {
      const { validateUploadRequest } = await import("@/lib/s3");
      const result = validateUploadRequest({
        filename: "logo.png",
        contentType: "image/png",
        size: 10,
      });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("rejects filenames with path traversal", async () => {
      const { validateUploadRequest } = await import("@/lib/s3");
      const result = validateUploadRequest({
        filename: "../../../etc/passwd",
        contentType: "text/plain",
        size: 10,
      });
      expect(result.valid).toBe(false);
    });

    it("rejects oversized uploads", async () => {
      const { MAX_UPLOAD_SIZE, validateUploadRequest } = await import(
        "@/lib/s3"
      );
      const result = validateUploadRequest({
        filename: "large.mp4",
        contentType: "video/mp4",
        size: MAX_UPLOAD_SIZE + 1,
      });
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/maximum size/i);
    });
  });
});
