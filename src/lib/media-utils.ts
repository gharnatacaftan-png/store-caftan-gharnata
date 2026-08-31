export const WORKER_CDN_BASE = "https://media.caftan-gharnata.com";
export const WORKER_UPLOAD_URL = "https://caftan-gharnata-upload.caftan-gharnata.workers.dev/api/r2-upload/upload";

/**
 * Resolves any media URL (R2, legacy proxy, local asset, HEIC) to its fastest CDN endpoint.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url || typeof url !== "string") return "/images/hero_caftan.webp";
  const clean = url.trim();
  if (!clean) return "/images/hero_caftan.webp";

  // HEIC/HEIF images route through Vercel server proxy for webp conversion if requested
  if (clean.match(/\.(heic|heif)$/i)) {
    if (clean.startsWith("/api/media/")) return clean;
    if (clean.startsWith("/")) return `/api/media${clean}`;
    const match = clean.match(/uploads\/.+/i);
    if (match) return `/api/media/${match[0]}`;
    return clean;
  }

  // Static bundled local assets
  if (clean.startsWith("/images/") || clean.startsWith("/favicon") || clean.startsWith("/icon") || clean.startsWith("/logo")) {
    return clean;
  }

  // Rewrite legacy slow dev subdomain or worker subdomain to Cloudflare R2 CDN Edge
  if (clean.includes("pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev/")) {
    const key = clean.split("pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev/")[1];
    return `${WORKER_CDN_BASE}/${key}`;
  }
  if (clean.includes(".r2.dev/")) {
    const idx = clean.indexOf(".r2.dev/");
    const key = clean.slice(idx + 8);
    return `${WORKER_CDN_BASE}/${key}`;
  }
  if (clean.includes("caftan-gharnata.workers.dev/")) {
    const match = clean.match(/uploads\/.+/i);
    if (match) return `${WORKER_CDN_BASE}/${match[0]}`;
  }

  // Rewrite /api/media/ or /media/ proxy paths directly to CDN Edge for maximum speed
  if (clean.startsWith("/api/media/")) {
    return `${WORKER_CDN_BASE}/${clean.slice("/api/media/".length)}`;
  }
  if (clean.startsWith("/media/")) {
    return `${WORKER_CDN_BASE}/${clean.slice("/media/".length)}`;
  }
  if (clean.startsWith("/api/stream/")) {
    return `${WORKER_CDN_BASE}/${clean.slice("/api/stream/".length)}`;
  }
  if (clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  return `${WORKER_CDN_BASE}/${clean.replace(/^\/+/, "")}`;
}

/**
 * Converts HEIC/HEIF files to 98% quality JPEG in browser prior to uploading.
 */
export async function ensureJpegIfHeic(file: File): Promise<File> {
  const isHeic = /\.(heic|heif)$/i.test(file.name) || /image\/(heic|heif)/i.test(file.type || "");
  if (!isHeic) return file;

  try {
    const heic2anyModule = await import("heic2any");
    const convert = heic2anyModule.default || heic2anyModule;
    const result = await convert({
      blob: file,
      toType: "image/jpeg",
      quality: 0.98, // Ultra-high quality JPEG
    });
    const blob = Array.isArray(result) ? result[0] : result;
    const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    return new File([blob], newName, { type: "image/jpeg" });
  } catch (err) {
    console.warn("HEIC conversion skipped or failed:", err);
    return file;
  }
}

export interface ProxyUploadResult {
  url: string;
  key: string;
  kind: "image" | "video";
  size: number;
}

/**
 * Uploads any file (up to 500MB) via Cloudflare Worker directly, avoiding Vercel payload limits.
 */
export async function uploadFileViaProxy(
  file: File,
  sessionHdrs: Record<string, string>,
  onProgress?: (pct: number, loadedMb: number, totalMb: number) => void
): Promise<ProxyUploadResult> {
  // Convert HEIC to JPEG if needed
  const fileToUpload = await ensureJpegIfHeic(file);

  // Get upload authorization secret from Vercel endpoint
  const authRes = await fetch("/api/admin/upload-auth", {
    headers: sessionHdrs,
  });
  const authData = await authRes.json();
  if (!authData.secret) throw new Error("Could not get upload authorization");

  const isImage =
    fileToUpload.type.startsWith("image/") ||
    /\.(heic|heif|png|jpg|jpeg|webp|avif|gif|bmp|tiff|jfif)$/i.test(fileToUpload.name);

  return new Promise((resolve, reject) => {
    const ext = fileToUpload.name.split(".").pop() || "bin";
    const key = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${WORKER_UPLOAD_URL}?key=${encodeURIComponent(key)}`, true);

    xhr.setRequestHeader("X-Admin-Secret", authData.secret);
    xhr.setRequestHeader("Content-Type", fileToUpload.type || "application/octet-stream");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct, e.loaded / 1024 / 1024, e.total / 1024 / 1024);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          if (data.ok) {
            resolve({
              url: `/api/media/${key}`,
              key: key,
              kind: isImage ? "image" : "video",
              size: fileToUpload.size,
            });
          } else {
            reject(new Error(data.error || "Upload response invalid"));
          }
        } catch {
          reject(new Error("Invalid JSON from upload worker"));
        }
      } else {
        reject(new Error(`Upload failed: HTTP ${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.ontimeout = () => reject(new Error("Upload timeout"));
    xhr.send(fileToUpload);
  });
}
