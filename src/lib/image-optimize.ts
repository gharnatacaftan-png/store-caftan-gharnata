// lib/image-optimize.ts — Downscale + re-encode still images on upload so the
// storefront serves small, fast files (no more multi-MB phone PNGs). Uses sharp,
// which is already a project dependency.
//
// Rules:
//   • Animated GIFs / multi-frame images pass through untouched.
//   • The longest side is capped at MAX_DIM px (heroes rarely need more).
//   • PNGs (often huge camera exports) are converted to lossy WebP.
//   • JPEG/WebP/AVIF are re-encoded at a sane quality, stripping EXIF weight.
//   • Anything sharp can't decode is returned unchanged (upload still works).
//
// sharp est chargé dynamiquement : son module natif n'est pas supporté par
// Cloudflare Workers, mais l'est sur Node. Sur Workers on retombe sur les
// octets d'origine (l'upload continue de fonctionner, sans réencodage local).

export interface OptimizedImage {
  buffer: Buffer;
  contentType: string;
  ext: string;
}

const MAX_DIM = 1920; // longest side, in pixels
const QUALITY = 82;

export async function optimizeUploadedImage(
  input: Buffer,
  mime: string,
): Promise<OptimizedImage> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default ?? sharpModule;
    const meta = await sharp(input).metadata();

    // Leave animated / multi-frame images (GIF, APNG, WebP-anim) untouched —
    // sharp would otherwise only keep the first frame.
    if (meta.format === "gif" || (meta.pages && meta.pages > 1)) {
      return { buffer: input, contentType: mime, ext: ".gif" };
    }

    let image = sharp(input);
    const longest = Math.max(meta.width || 0, meta.height || 0);
    if (longest > MAX_DIM) {
      image = image.resize({
        width: MAX_DIM,
        height: MAX_DIM,
        fit: "inside",
        withoutEnlargement: true,
      });
    }

    const format = String(meta.format || "").toLowerCase();

    switch (format) {
      case "png":
        // PNG → WebP is the biggest win for storefront photos/designs.
        return {
          buffer: await image.webp({ quality: QUALITY }).toBuffer(),
          contentType: "image/webp",
          ext: ".webp",
        };
      case "jpeg":
        return {
          buffer: await image.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer(),
          contentType: "image/jpeg",
          ext: ".jpg",
        };
      case "webp":
        return {
          buffer: await image.webp({ quality: QUALITY }).toBuffer(),
          contentType: "image/webp",
          ext: ".webp",
        };
      case "avif":
        return {
          buffer: await image.avif({ quality: QUALITY }).toBuffer(),
          contentType: "image/avif",
          ext: ".avif",
        };
      // ─── Mobile / iPhone photo formats ──────────────────────────────────────
      // iPhone saves photos as HEIC (sharp reports format as "heif").
      // Browsers CANNOT display HEIC natively → MUST convert to WebP.
      case "heif": // covers both .heic and .heif
      case "heic":
      case "tiff":
      case "tif":
      case "bmp":
      case "jfif":
        return {
          buffer: await image.webp({ quality: QUALITY }).toBuffer(),
          contentType: "image/webp",
          ext: ".webp",
        };
      default:
        // Unknown format: try to convert to JPEG as universal fallback.
        // This is safer than passing raw bytes that browsers may refuse to display.
        try {
          return {
            buffer: await image.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer(),
            contentType: "image/jpeg",
            ext: ".jpg",
          };
        } catch {
          // If even JPEG conversion fails, return the original (upload still works)
          return { buffer: input, contentType: mime, ext: extFromMime(mime) };
        }
    }
  } catch {
    // sharp indisponible (Workers) ou image illisible — on garde les octets
    // d'origine pour que l'upload aboutisse quand même.
    return { buffer: input, contentType: mime, ext: extFromMime(mime) };
  }
}

function extFromMime(mime: string): string {
  if (mime === "image/jpeg") return ".jpg";
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/avif") return ".avif";
  if (mime === "image/gif") return ".gif";
  return ".jpg";
}
