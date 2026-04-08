import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET ?? "";
const REGION = process.env.AWS_REGION ?? "us-east-1";

/** Presigned URL expiry in seconds (15 minutes) */
const PRESIGN_EXPIRES = 900;

/** Maximum upload size: 50 MB */
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024;

export const ALLOWED_CONTENT_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/css",
  "application/json",
  "application/javascript",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/ogg",
  "font/woff",
  "font/woff2",
] as const;

const s3 = new S3Client({ region: REGION });

/**
 * Build the S3 object key following the convention:
 * `{orgId}/{projectId}/assets/{filename}`
 */
export function buildS3Key(
  orgId: string,
  projectId: string,
  filename: string,
): string {
  const sanitized = filename.replace(/^\/+/, "");
  return `${orgId}/${projectId}/assets/${sanitized}`;
}

interface UploadPresignParams {
  orgId: string;
  projectId: string;
  filename: string;
  contentType: string;
  size: number;
}

/**
 * Generate a presigned PUT URL so the client can upload directly to S3.
 */
export async function getUploadPresignedUrl(
  params: UploadPresignParams,
): Promise<{ url: string; key: string }> {
  const key = buildS3Key(params.orgId, params.projectId, params.filename);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: params.contentType,
    ContentLength: params.size,
  });
  const url = await getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES });
  return { url, key };
}

/**
 * Generate a presigned GET URL for downloading/viewing a file.
 */
export async function getDownloadPresignedUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: PRESIGN_EXPIRES });
}

/**
 * Delete an object from S3.
 */
export async function deleteObject(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * Check whether an object exists in S3.
 */
export async function objectExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (err: unknown) {
    if (
      err instanceof Error &&
      (err.name === "NotFound" || err.name === "NoSuchKey")
    ) {
      return false;
    }
    throw err;
  }
}

interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate an upload request before generating a presigned URL.
 */
export function validateUploadRequest(params: {
  filename: string;
  contentType: string;
  size: number;
}): ValidationResult {
  if (!params.filename || params.filename.trim() === "") {
    return { valid: false, error: "Filename is required" };
  }

  // Block path traversal
  if (params.filename.includes("..")) {
    return {
      valid: false,
      error: "Invalid filename: path traversal not allowed",
    };
  }

  if (
    !(ALLOWED_CONTENT_TYPES as readonly string[]).includes(params.contentType)
  ) {
    return {
      valid: false,
      error: `Disallowed content type: ${params.contentType}`,
    };
  }

  if (!Number.isFinite(params.size) || params.size < 0) {
    return {
      valid: false,
      error: "File size must be a valid non-negative number",
    };
  }

  if (params.size > MAX_UPLOAD_SIZE) {
    return {
      valid: false,
      error: `File exceeds maximum size of ${MAX_UPLOAD_SIZE} bytes`,
    };
  }

  return { valid: true };
}
