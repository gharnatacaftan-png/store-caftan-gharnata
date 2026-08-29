import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { getR2Client, r2PresignedUpload, r2Url, r2Upload } from "@/lib/r2";
import { optimizeUploadedImage } from "@/lib/image-optimize";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import { rateLimit, getClientIp, okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";

const BUCKET = process.env.R2_BUCKET_NAME || "caftan-gharnata-media";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB max for any file

function getFileKind(mimeType: string, fileName?: string): "IMAGE" | "VIDEO" | "UNKNOWN" {
  const rawExt = fileName ? path.extname(fileName).toLowerCase() : "";
  const imageExts = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".heic", ".heif", ".bmp", ".tiff", ".tif", ".jfif"];
  const videoExts = [".mp4", ".webm", ".mov", ".mkv", ".avi", ".3gp", ".3g2", ".ogv", ".flv", ".mpeg", ".ts", ".wmv", ".m4v"];

  if (mimeType.startsWith("image/") || imageExts.includes(rawExt)) {
    return "IMAGE";
  }
  if (mimeType.startsWith("video/") || videoExts.includes(rawExt)) {
    return "VIDEO";
  }
  return "UNKNOWN";
}

function getMimeType(fileName: string, fallbackMime?: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".avif": "image/avif",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".bmp": "image/bmp",
    ".tiff": "image/tiff",
    ".tif": "image/tiff",
    ".jfif": "image/jpeg",
    ".mp4": "video/mp4",
    ".webm": "video/webm",
    ".mov": "video/quicktime",
    ".mkv": "video/x-matroska",
    ".avi": "video/avi",
    ".3gp": "video/3gpp",
    ".3g2": "video/3gpp2",
    ".ogv": "video/ogg",
    ".flv": "video/x-flv",
    ".mpeg": "video/mpeg",
    ".ts": "video/mp2t",
    ".wmv": "video/x-ms-wmv",
    ".m4v": "video/x-m4v",
  };
  return mimeMap[ext] || fallbackMime || "application/octet-stream";
}

function getSafeExt(fileName: string, mimeType: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const safeImageExts = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif", ".heic", ".heif", ".bmp", ".tiff", ".tif", ".jfif"];
  const safeVideoExts = [".mp4", ".webm", ".mov", ".mkv", ".avi", ".3gp", ".3g2", ".ogv", ".flv", ".mpeg", ".ts", ".wmv", ".m4v"];
  const allSafe = [...safeImageExts, ...safeVideoExts];
  
  if (allSafe.includes(ext)) return ext;
  
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/avif": ".avif", "image/gif": ".gif",
    "image/heic": ".heic", "image/heif": ".heif", "image/bmp": ".bmp", "image/tiff": ".tiff",
    "video/mp4": ".mp4", "video/webm": ".webm", "video/quicktime": ".mov", "video/x-matroska": ".mkv",
    "video/avi": ".avi", "video/3gpp": ".3gp", "video/3gpp2": ".3g2", "video/ogg": ".ogv",
    "video/x-flv": ".flv", "video/mpeg": ".mpeg", "video/mp2t": ".ts",
    "video/x-ms-wmv": ".wmv", "video/x-m4v": ".m4v",
  };
  
  return mimeToExt[mimeType] || (mimeType.startsWith("image/") ? ".jpg" : ".mp4");
}

// 1. POST: Request presigned URLs for multiple files
export async function POST(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const ip = getClientIp(req);
  if (!rateLimit(`admin-upload-presign:${ip}`, { windowMs: 60_000, max: 30 })) {
    return errorResponse("Too many upload requests. Wait a moment.", 429);
  }

  try {
    const body = await req.json() as { files: Array<{ name: string; type: string; size: number }> };
    const files = body.files || [];

    if (!files.length) {
      return errorResponse("No files provided", 400);
    }
    if (files.length > 20) {
      return errorResponse("Maximum 20 files per request", 400);
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const mimeType = getMimeType(file.name, file.type);
        const kind = getFileKind(mimeType, file.name);
        
        if (kind === "UNKNOWN") {
          throw new Error(`Unsupported file type: ${file.name}`);
        }

        if (file.size > MAX_FILE_SIZE) {
          throw new Error(`File too large: ${file.name} (max 500MB)`);
        }

        const safeExt = getSafeExt(file.name, mimeType);
        const folder = kind === "VIDEO" ? "uploads/videos" : "uploads/images";
        const key = `${folder}/${Date.now()}-${uuidv4()}${safeExt}`;

        const presignedUrl = await r2PresignedUpload(key, mimeType, 60 * 60);
        const publicUrl = r2Url(key);

        return {
          key,
          presignedUrl,
          publicUrl,
          mimeType,
          kind: kind.toLowerCase(),
          originalName: file.name,
          size: file.size,
        };
      })
    );

    return okResponse({ ok: true, files: results });
  } catch (error) {
    console.error("[admin/upload presign]", error);
    return errorResponse(error instanceof Error ? error.message : "Failed to create upload URLs", 500);
  }
}

// 2. PATCH: Confirm upload complete, optimize images server-side
export async function PATCH(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const ip = getClientIp(req);
  if (!rateLimit(`admin-upload-confirm:${ip}`, { windowMs: 60_000, max: 30 })) {
    return errorResponse("Too many requests", 429);
  }

  try {
    const body = await req.json() as { keys: string[] };
    const keys = body.keys || [];

    if (!keys.length) {
      return errorResponse("No keys provided", 400);
    }

    const client = getR2Client();
    const results = [];

    for (const key of keys) {
      // Verify file exists in R2
      try {
        const headCmd = new (await import("@aws-sdk/client-s3")).HeadObjectCommand({ Bucket: BUCKET, Key: key });
        await client.send(headCmd);
      } catch {
        results.push({ key, ok: false, error: "File not found in R2" });
        continue;
      }

      // Optimize images server-side
      let finalKey = key;
      let finalMimeType = "";
      let finalSize = 0;

      const isVideo = key.match(/\.(mp4|webm|mov|mkv|avi|3gp|mpeg|wmv|m4v)$/i);
      
      if (!isVideo) {
        // Download, optimize, re-upload
        try {
          const getCmd = new (await import("@aws-sdk/client-s3")).GetObjectCommand({ Bucket: BUCKET, Key: key });
          const obj = await client.send(getCmd);
          if (obj.Body) {
            const bytes = Buffer.from(await obj.Body.transformToByteArray());
            const optimized = await optimizeUploadedImage(bytes, obj.ContentType || "image/jpeg");
            
            // Re-upload optimized version
            const optimizedKey = key.replace(/\.[^.]+$/, "") + optimized.ext;
            await client.send(
              new (await import("@aws-sdk/client-s3")).PutObjectCommand({
                Bucket: BUCKET,
                Key: optimizedKey,
                Body: optimized.buffer,
                ContentType: optimized.contentType,
                ContentLength: optimized.buffer.length,
              })
            );
            
            // Delete original
            await client.send(
              new (await import("@aws-sdk/client-s3")).DeleteObjectCommand({ Bucket: BUCKET, Key: key })
            );
            
            finalKey = optimizedKey;
            finalMimeType = optimized.contentType;
            finalSize = optimized.buffer.length;
          }
        } catch (optError) {
          console.error("[upload optimize error]", optError);
          // Keep original if optimization fails
          const headCmd = new (await import("@aws-sdk/client-s3")).HeadObjectCommand({ Bucket: BUCKET, Key: key });
          const head = await client.send(headCmd);
          finalMimeType = head.ContentType || "image/jpeg";
          finalSize = head.ContentLength || 0;
        }
      } else {
        // Video - just get metadata
        const headCmd = new (await import("@aws-sdk/client-s3")).HeadObjectCommand({ Bucket: BUCKET, Key: key });
        const head = await client.send(headCmd);
        finalMimeType = head.ContentType || "video/mp4";
        finalSize = head.ContentLength || 0;
      }

      results.push({
        key: finalKey,
        url: r2Url(finalKey),
        mimeType: finalMimeType,
        size: finalSize,
        kind: isVideo ? "video" : "image",
      });
    }

    return okResponse({ ok: true, files: results });
  } catch (error) {
    console.error("[admin/upload confirm]", error);
    return errorResponse(error instanceof Error ? error.message : "Failed to confirm uploads", 500);
  }
}

// 3. DELETE: Remove files from R2
export async function DELETE(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  try {
    const { searchParams } = new URL(req.url);
    const keys = searchParams.get("keys")?.split(",").filter(Boolean) || [];

    if (!keys.length) {
      return errorResponse("No keys provided", 400);
    }

    const client = getR2Client();
    for (const key of keys) {
      await client.send(
        new (await import("@aws-sdk/client-s3")).DeleteObjectCommand({ Bucket: BUCKET, Key: key })
      ).catch(() => {});
    }

    return okResponse({ ok: true, deleted: keys.length });
  } catch (error) {
    console.error("[admin/upload delete]", error);
    return errorResponse("Failed to delete files", 500);
  }
}