import "server-only";
// lib/r2.ts
// Cloudflare R2 via S3-compatible API (AWS SDK v3)
//
// ARCHITECTURE RULE:
//   Every file uploaded returns the FULL Cloudflare R2 Public URL.
//   This URL is stored as-is in D1. No proxying, no rewrites ever.
//   Cloudflare R2 natively supports HTTP Range Requests (206) = video streaming works.

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dns from "node:dns";

// Force Node.js on Windows / Localhost to resolve IPv4 first (prevents local ISP IPv6 DNS timeouts)
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {}

export function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
    forcePathStyle: true,
  });
}

const BUCKET = process.env.R2_BUCKET_NAME || "caftan-gharnata-media";

// The Cloudflare R2 Public Development URL â€” always used as base for public URLs.
// Set R2_PUBLIC_URL in .env.local to override (e.g. for a custom domain).
const R2_PUBLIC_BASE = (process.env.R2_PUBLIC_URL || "https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev").replace(/\/$/, "");

// ---------------------------------------------------------------------------
// Build a full public URL from an R2 object key (for images)
// ---------------------------------------------------------------------------
export function r2Url(key: string): string {
  return `${R2_PUBLIC_BASE}/${key}`;
}

// ---------------------------------------------------------------------------
// Build a stream proxy URL from an R2 URL or key (for videos).
// The /api/stream route handles CORS + Range requests correctly.
// ---------------------------------------------------------------------------
export function r2VideoUrl(r2UrlOrKey: string): string {
  if (!r2UrlOrKey) return "";
  let key = r2UrlOrKey;
  if (key.startsWith(`${R2_PUBLIC_BASE}/`)) {
    key = key.slice(`${R2_PUBLIC_BASE}/`.length);
  } else if (key.startsWith("/api/media/")) {
    key = key.slice("/api/media/".length);
  } else if (key.startsWith("/api/stream/")) {
    return r2UrlOrKey; // already a stream URL
  }
  return `/api/stream/${key}`;
}

// ---------------------------------------------------------------------------
// Extract the R2 object key from a stored URL, or null if the URL does not
// belong to this bucket (e.g. a bundled /images/... default or an external URL).
// Accepts full R2 public URLs and legacy /api/media/... proxy paths so the old
// stored values can still be cleaned up.
// ---------------------------------------------------------------------------
export function r2KeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const clean = url.trim();
  if (clean.startsWith(`${R2_PUBLIC_BASE}/`)) {
    return clean.slice(`${R2_PUBLIC_BASE}/`.length);
  }
  if (clean.startsWith("/api/media/")) {
    return clean.slice("/api/media/".length);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Upload a file (Buffer or Uint8Array) to R2
// Returns the FULL public URL, not a relative path.
// ---------------------------------------------------------------------------
export async function r2Upload(options: {
  key: string;           // e.g. "uploads/abc123.jpg"
  body: Buffer | Uint8Array;
  contentType: string;   // e.g. "image/jpeg"
  fileSizeBytes: number;
}): Promise<{ key: string; url: string; fileSizeBytes: number }> {
  const client = getR2Client();

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType,
      ContentLength: options.fileSizeBytes,
    })
  );

  return {
    key: options.key,
    url: r2Url(options.key),   // always the full Cloudflare public URL
    fileSizeBytes: options.fileSizeBytes,
  };
}

// ---------------------------------------------------------------------------
// Get a file from R2 (used by the /api/media proxy â€” kept for compatibility)
// ---------------------------------------------------------------------------
export async function r2Get(key: string): Promise<{ body: Uint8Array; contentType: string } | null> {
  try {
    const client = getR2Client();
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const response = await client.send(command);
    if (!response.Body) return null;
    const bytes = await response.Body.transformToByteArray();
    return {
      body: bytes,
      contentType: response.ContentType || "application/octet-stream",
    };
  } catch (err) {
    console.error("[r2Get error]", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Delete a file from R2
// ---------------------------------------------------------------------------
export async function r2Delete(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

// ---------------------------------------------------------------------------
// Generate a pre-signed URL for direct browser upload (presign route)
// ---------------------------------------------------------------------------
export async function r2PresignedUpload(key: string, contentType: string, expiresIn = 300): Promise<string> {
  const client = getR2Client();
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(client, command, { expiresIn });
}

// ---------------------------------------------------------------------------
// List EVERY object currently stored in the bucket, with its real byte size.
// Used by the dashboard storage page so the "used / free" numbers reflect what
// R2 actually holds (not just what D1 records) â€” including orphaned files.
// Paginated: R2 returns up to 1000 keys per call.
// ---------------------------------------------------------------------------
export async function r2ListObjects(): Promise<{ key: string; size: number }[]> {
  const client = getR2Client();
  const objects: { key: string; size: number }[] = [];
  let continuationToken: string | undefined;

  do {
    const res = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        ContinuationToken: continuationToken,
      })
    );
    for (const obj of res.Contents || []) {
      if (obj.Key) objects.push({ key: obj.Key, size: obj.Size || 0 });
    }
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (continuationToken);

  return objects;
}

// ---------------------------------------------------------------------------
// Delete a list of R2 objects (orphans, stray uploads, â€¦). Individual deletes
// are fine here â€” the bucket is small and this runs from the admin cleanup page.
// ---------------------------------------------------------------------------
export async function r2DeleteMany(keys: string[]): Promise<number> {
  let deleted = 0;
  for (const key of keys) {
    try {
      await r2Delete(key);
      deleted++;
    } catch (err) {
      console.error(`[r2DeleteMany] failed for ${key}`, err);
    }
  }
  return deleted;
}
