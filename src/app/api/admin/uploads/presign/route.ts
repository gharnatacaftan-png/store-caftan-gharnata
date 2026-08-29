// app/api/admin/uploads/presign/route.ts
// Generates a short-lived presigned PUT URL so the browser can upload
// video files DIRECTLY to Cloudflare R2 — bypassing Next.js body limits entirely.
import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { r2PresignedUpload, r2Url } from "@/lib/r2";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import {
  rateLimit, getClientIp,
  MAX_VIDEO_SIZE,
  okResponse, errorResponse,
} from "@/lib/security";

export const runtime = "nodejs";

const VIDEO_MIME_TO_EXT: Record<string, string> = {
  "video/mp4":       ".mp4",
  "video/webm":      ".webm",
  "video/quicktime": ".mov",
  "video/mov":       ".mov",
  "video/x-matroska":".mkv",
  "video/avi":       ".avi",
  "video/x-msvideo": ".avi",
  "video/3gpp":      ".3gp",
  "video/3gpp2":     ".3g2",
  "video/mpeg":      ".mpeg",
  "video/x-ms-wmv":  ".wmv",
  "video/x-m4v":     ".m4v",
  "video/ogg":       ".ogv",
};

export async function POST(req: NextRequest) {
  // Auth + CSRF
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  // Rate limit — 20 presign requests / minute / IP
  const ip = getClientIp(req);
  if (!rateLimit(`vid-presign:${ip}`, { windowMs: 60_000, max: 20 })) {
    return errorResponse("Too many requests. Wait a minute.", 429);
  }

  try {
    const body = await req.json() as { fileType?: string; fileSize?: number; fileName?: string };
    let { fileType, fileSize, fileName } = body;

    // Detect MIME type from extension if missing or generic on mobile
    const rawFileName = decodeURIComponent(fileName || "");
    const rawExt = rawFileName ? rawFileName.slice(rawFileName.lastIndexOf(".")).toLowerCase() : "";

    if (!fileType || fileType === "application/octet-stream" || !fileType.startsWith("video/")) {
      if (rawExt === ".mov") fileType = "video/quicktime";
      else if (rawExt === ".mp4") fileType = "video/mp4";
      else if (rawExt === ".webm") fileType = "video/webm";
      else if (rawExt === ".3gp") fileType = "video/3gpp";
      else if (rawExt === ".m4v") fileType = "video/x-m4v";
      else if (rawExt === ".avi") fileType = "video/avi";
      else if (rawExt === ".mkv") fileType = "video/x-matroska";
      else fileType = "video/mp4"; // Default fallback for video presign
    }

    // Must be a video
    if (!fileType.startsWith("video/")) {
      return errorResponse("فقط ملفات الفيديو مسموح بها هنا", 400);
    }

    // Size check
    const size = Number(fileSize ?? 0);
    if (size > MAX_VIDEO_SIZE) {
      const limitMb = Math.round(MAX_VIDEO_SIZE / 1024 / 1024);
      return errorResponse(`الفيديو كبير جداً. الحد الأقصى ${limitMb} MB`, 400);
    }

    // Build a safe key
    const ext = VIDEO_MIME_TO_EXT[fileType] ?? ".mp4";
    const key = `uploads/${Date.now()}-${uuidv4()}${ext}`;

    // Generate presigned PUT URL — valid for 30 minutes
    const presignedUrl = await r2PresignedUpload(key, fileType, 30 * 60);

    // The URL clients will use to display/proxy the video
    const publicUrl = r2Url(key);

    console.log(`[presign] Generated for "${fileName}" (${fileType}, ${size} bytes) → ${key}`);

    return okResponse({ ok: true, presignedUrl, key, publicUrl });
  } catch (error) {
    console.error("[vid-presign]", error);
    return errorResponse("فشل إنشاء رابط الرفع المؤقت", 500);
  }
}
