// app/api/admin/uploads/presign/route.ts
//
// Generates a short-lived presigned PUT URL so the browser can upload
// files DIRECTLY to Cloudflare R2 — bypassing Next.js/Vercel body limits
// and serverless timeouts entirely.
//
// Architecture (identical to the ERP project):
//   1. Client sends a tiny JSON request: { fileName, fileType, fileSize }
//   2. Server validates, generates a presigned PUT URL (signed with R2 keys)
//   3. Client uploads the binary file directly to R2 using the presigned URL
//   4. R2 stores the file; client uses publicUrl to reference it
//
// This approach works on ALL devices (iOS, Android, etc.) because:
//   - No file bytes ever pass through the Vercel server (no 4.5MB limit)
//   - No serverless timeout risk (R2 accepts large files natively)
//   - CORS is handled by R2 bucket policy (configured separately)

import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { r2PresignedUpload, r2Url } from "@/lib/r2";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import { rateLimit, getClientIp, okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";

// Maps file extensions to their canonical MIME type
const EXT_TO_MIME: Record<string, string> = {
  // Images
  ".jpg":  "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png":  "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".gif":  "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  // Videos
  ".mp4":  "video/mp4",
  ".webm": "video/webm",
  ".mov":  "video/quicktime",
  ".mkv":  "video/x-matroska",
  ".avi":  "video/avi",
  ".3gp":  "video/3gpp",
  ".m4v":  "video/x-m4v",
  ".wmv":  "video/x-ms-wmv",
  ".mpeg": "video/mpeg",
};

// Maps MIME type to file extension for key generation
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg":        ".jpg",
  "image/png":         ".png",
  "image/webp":        ".webp",
  "image/avif":        ".avif",
  "image/gif":         ".gif",
  "image/heic":        ".heic",
  "image/heif":        ".heif",
  "video/mp4":         ".mp4",
  "video/webm":        ".webm",
  "video/quicktime":   ".mov",
  "video/mov":         ".mov",
  "video/x-matroska":  ".mkv",
  "video/avi":         ".avi",
  "video/x-msvideo":   ".avi",
  "video/3gpp":        ".3gp",
  "video/3gpp2":       ".3g2",
  "video/x-m4v":       ".m4v",
  "video/x-ms-wmv":    ".wmv",
  "video/mpeg":        ".mpeg",
};

// Maximum file sizes
const MAX_IMAGE_BYTES = 30 * 1024 * 1024;   // 30 MB (sharp will compress it server-side for stored images)
const MAX_VIDEO_BYTES = 500 * 1024 * 1024;  // 500 MB

export async function POST(req: NextRequest) {
  // 1. Admin authentication + CSRF check
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  // 2. Rate limit — 30 presign requests / minute per IP
  const ip = getClientIp(req);
  if (!rateLimit(`presign:${ip}`, { windowMs: 60_000, max: 30 })) {
    return errorResponse("Too many requests. Please wait a moment.", 429);
  }

  try {
    const body = await req.json() as {
      fileName?: string;
      fileType?: string;
      fileSize?: number;
    };

    const rawFileName = String(body.fileName || "").trim();
    const rawFileSize = Number(body.fileSize ?? 0);

    // Extract extension from original filename
    const lastDot = rawFileName.lastIndexOf(".");
    const ext = lastDot >= 0 ? rawFileName.slice(lastDot).toLowerCase() : "";

    // Determine MIME type: trust the client value, but fix generic/missing types using extension
    let mimeType = String(body.fileType || "").trim().toLowerCase();
    if (!mimeType || mimeType === "application/octet-stream") {
      mimeType = EXT_TO_MIME[ext] || "";
    }

    if (!mimeType) {
      return errorResponse(`Format de fichier non reconnu: "${ext || rawFileName}"`, 400);
    }

    // Classify as image or video
    const isImage = mimeType.startsWith("image/");
    const isVideo = mimeType.startsWith("video/");

    if (!isImage && !isVideo) {
      return errorResponse(`Type non supporté: ${mimeType}`, 400);
    }

    // Size check
    const maxSize = isVideo ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    if (rawFileSize > 0 && rawFileSize > maxSize) {
      const limitMb = Math.round(maxSize / 1024 / 1024);
      return errorResponse(
        `الملف كبير جداً. الحد الأقصى ${limitMb} MB (الحجم المُرسل: ${(rawFileSize / 1024 / 1024).toFixed(1)} MB)`,
        400
      );
    }

    // Build a safe, unique storage key
    const folder = isVideo ? "uploads/videos" : "uploads/images";
    const safeExt = MIME_TO_EXT[mimeType] ?? ext ?? (isVideo ? ".mp4" : ".jpg");
    const key = `${folder}/${Date.now()}-${uuidv4()}${safeExt}`;

    // Generate presigned PUT URL — valid for 60 minutes (enough for slow connections)
    const presignedUrl = await r2PresignedUpload(key, mimeType, 60 * 60);

    // Public URL clients will use to display the file
    const publicUrl = r2Url(key);

    console.log(
      `[presign] ✅ "${rawFileName}" (${mimeType}, ${(rawFileSize / 1024 / 1024).toFixed(2)} MB) → ${key}`
    );

    return okResponse({ ok: true, presignedUrl, publicUrl, key, mimeType });
  } catch (error) {
    console.error("[presign] ❌", error);
    return errorResponse("فشل إنشاء رابط الرفع", 500);
  }
}
