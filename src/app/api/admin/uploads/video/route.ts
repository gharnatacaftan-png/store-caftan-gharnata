// app/api/admin/uploads/video/route.ts
// Accepts a raw video binary body (Content-Type: video/*) and uploads it
// directly to Cloudflare R2. No multipart/form-data parsing — no body limit issues.
import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { r2Upload } from "@/lib/r2";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import {
  rateLimit, getClientIp,
  MAX_VIDEO_SIZE, okResponse, errorResponse,
} from "@/lib/security";

export const runtime = "nodejs";

const VIDEO_MIME_TO_EXT: Record<string, string> = {
  "video/mp4":        ".mp4",
  "video/webm":       ".webm",
  "video/quicktime":  ".mov",
  "video/mov":        ".mov",
  "video/x-matroska": ".mkv",
  "video/avi":        ".avi",
  "video/x-msvideo":  ".avi",
  "video/3gpp":       ".3gp",
  "video/3gpp2":      ".3g2",
  "video/mpeg":       ".mpeg",
  "video/x-ms-wmv":   ".wmv",
  "video/x-m4v":      ".m4v",
  "video/ogg":        ".ogv",
};

export async function POST(req: NextRequest) {
  // 1. Auth + CSRF
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  // 2. Rate limit — 10 video uploads per minute per IP
  const ip = getClientIp(req);
  if (!rateLimit(`vid-upload:${ip}`, { windowMs: 60_000, max: 10 })) {
    return errorResponse("Too many upload requests. Wait a minute.", 429);
  }

  try {
    // 3. Validate Content-Type header (must be a video or fallback from extension)
    let contentType = (req.headers.get("x-file-type") || req.headers.get("content-type") || "").split(";")[0].trim();
    const rawFileName = decodeURIComponent(req.headers.get("x-file-name") || "");
    const rawExt = rawFileName ? rawFileName.slice(rawFileName.lastIndexOf(".")).toLowerCase() : "";

    if (!contentType || contentType === "application/octet-stream" || !contentType.startsWith("video/")) {
      if (rawExt === ".mov") contentType = "video/quicktime";
      else if (rawExt === ".mp4") contentType = "video/mp4";
      else if (rawExt === ".webm") contentType = "video/webm";
      else if (rawExt === ".3gp") contentType = "video/3gpp";
      else if (rawExt === ".m4v") contentType = "video/x-m4v";
      else if (rawExt === ".avi") contentType = "video/avi";
      else if (rawExt === ".mkv") contentType = "video/x-matroska";
      else contentType = "video/mp4"; // Default fallback for video endpoint
    }

    if (!contentType.startsWith("video/")) {
      return errorResponse(`نوع الملف غير مدعوم: "${contentType}". فقط ملفات الفيديو مسموح بها.`, 400);
    }

    // 4. Size check via header (before reading body)
    const declaredSize = Number(req.headers.get("x-file-size") || req.headers.get("content-length") || "0");
    if (declaredSize > MAX_VIDEO_SIZE) {
      const limitMb = Math.round(MAX_VIDEO_SIZE / 1024 / 1024);
      return errorResponse(`الفيديو كبير جداً. الحد الأقصى ${limitMb} MB.`, 400);
    }

    // 5. Read raw body (no FormData parsing — handles large files correctly)
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      return errorResponse("ملف الفيديو فارغ", 400);
    }

    // 6. Generate safe R2 key
    const ext = VIDEO_MIME_TO_EXT[contentType] ?? ".mp4";
    const key = `uploads/${Date.now()}-${uuidv4()}${ext}`;

    // 7. Upload to R2
    const uploaded = await r2Upload({
      key,
      body: buffer,
      contentType,
      fileSizeBytes: buffer.length,
    });

    console.log(`[vid-upload] ✅ Uploaded ${buffer.length} bytes → ${key}`);

    return okResponse({
      ok: true,
      files: [{ url: uploaded.url, key: uploaded.key, kind: "video", size: buffer.length }],
    });

  } catch (error) {
    console.error("[vid-upload] ❌", error);
    return errorResponse("فشل رفع الفيديو إلى Cloudflare R2", 500);
  }
}
