import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { r2Upload } from "@/lib/r2";
import { optimizeUploadedImage } from "@/lib/image-optimize";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import {
  rateLimit, getClientIp,
  ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES,
  MAX_IMAGE_SIZE, MAX_VIDEO_SIZE,
  okResponse, errorResponse,
} from "@/lib/security";

export const runtime = "nodejs";

function getFileKind(mimeType: string, fileName?: string): "IMAGE" | "VIDEO" | "UNKNOWN" {
  const rawExt = fileName ? path.extname(fileName).toLowerCase() : "";
  const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".heic", ".heif", ".bmp", ".tiff", ".jfif"];
  const videoExts = [".mp4", ".webm", ".mov", ".mkv", ".avi", ".3gp", ".3g2", ".ogv", ".flv", ".mpeg", ".ts", ".wmv", ".m4v"];

  if (ALLOWED_IMAGE_TYPES.includes(mimeType) || imageExts.includes(rawExt) || mimeType.startsWith("image/")) {
    return "IMAGE";
  }
  if (ALLOWED_VIDEO_TYPES.includes(mimeType) || videoExts.includes(rawExt) || mimeType.startsWith("video/")) {
    return "VIDEO";
  }
  return "UNKNOWN";
}

export async function POST(req: NextRequest) {
  // 1. Admin Auth + CSRF Check
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  // 2. Rate Limit
  const ip = getClientIp(req);
  if (!rateLimit(`admin-upload:${ip}`, { windowMs: 60_000, max: 30 })) {
    return errorResponse("Too many upload requests. Wait a minute.", 429);
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return errorResponse("لم يتم إرسال أي ملف", 400);
    }
    if (files.length > 10) {
      return errorResponse("10 ملفات كحد أقصى في المرة الواحدة", 400);
    }

    const results = await Promise.all(
      files.map(async (file) => {
        // Fallback for iPhone/Android files that might not have a clear MIME type
        let fileType = file.type;
        const rawExt = path.extname(file.name).toLowerCase();
        
        if (!fileType || fileType === "application/octet-stream") {
          if (rawExt === ".mov") fileType = "video/quicktime";
          else if (rawExt === ".mp4") fileType = "video/mp4";
          else if (rawExt === ".heic") fileType = "image/heic";
          else if (rawExt === ".heif") fileType = "image/heif";
          else if (rawExt === ".jpg" || rawExt === ".jpeg") fileType = "image/jpeg";
          else if (rawExt === ".png") fileType = "image/png";
          else if (rawExt === ".webp") fileType = "image/webp";
        }

        const kind = getFileKind(fileType, file.name);
        if (kind === "UNKNOWN") {
          throw new Error(`نوع الملف غير مدعوم: ${fileType || rawExt || "Unknown"}`);
        }

        const maxSize = kind === "IMAGE" ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
        if (file.size > maxSize) {
          const limitMb = Math.round(maxSize / 1024 / 1024);
          throw new Error(`حجم الملف كبير جداً: ${file.name} (الحد الأقصى ${limitMb}MB)`);
        }

        const mimeToExt: Record<string, string> = {
          "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif", "image/gif": ".gif",
          "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov", "video/mov": ".mov",
          "video/x-matroska": ".mkv", "video/avi": ".avi", "video/x-msvideo": ".avi",
          "video/3gpp": ".3gp", "video/3gpp2": ".3g2", "video/ogg": ".ogv",
          "video/x-flv": ".flv", "video/mpeg": ".mpeg", "video/mp2t": ".ts",
          "video/x-ms-wmv": ".wmv", "video/x-m4v": ".m4v",
        };

        const SAFE_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".mp4", ".webm", ".mov", ".mkv", ".avi", ".3gp", ".3g2", ".ogv", ".flv", ".mpeg", ".ts", ".wmv", ".m4v"];
        const safeExt = SAFE_EXTS.includes(rawExt) ? rawExt : (mimeToExt[fileType] ?? (kind === "IMAGE" ? ".jpg" : ".mp4"));

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Downscale + re-encode still images so the storefront loads fast
        // (no more multi-MB phone PNGs hitting the CDN / image optimizer).
        let outBuffer: Buffer = buffer;
        let outType = fileType;
        let outExt = safeExt;
        if (kind === "IMAGE") {
          const optimized = await optimizeUploadedImage(buffer, fileType);
          outBuffer = optimized.buffer;
          outType = optimized.contentType;
          outExt = optimized.ext;
        }

        const key = `uploads/${Date.now()}-${uuidv4()}${outExt}`;

        const uploaded = await r2Upload({
          key,
          body: outBuffer,
          contentType: outType,
          fileSizeBytes: outBuffer.length,
        });

        return {
          url: uploaded.url,
          key: uploaded.key,
          kind: kind.toLowerCase(),
          size: outBuffer.length,
        };
      })
    );

    return okResponse({ ok: true, files: results });
  } catch (error) {
    console.error("[admin/uploads POST]", error);
    return errorResponse(error instanceof Error ? error.message : "فشل رفع الملف", 400);
  }
}
