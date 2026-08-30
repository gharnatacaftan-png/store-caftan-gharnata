// app/api/media/[...key]/route.ts — Media & Video Streaming Proxy for Cloudflare R2 Assets
import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "@/lib/r2";

export const runtime = "nodejs";

const BUCKET = process.env.R2_BUCKET_NAME || "caftan-gharnata-media";


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ key: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const keyArray = resolvedParams.key || [];
    let key = keyArray.join("/");

    if (key.includes("pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev/")) {
      key = key.split("pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev/")[1];
    }

    if (!key) {
      return new NextResponse("Media key required", { status: 400 });
    }

    const rangeHeader = req.headers.get("range");
    const etag = `"${key.replace(/[^a-zA-Z0-9]/g, "-")}"`;
    const ifNoneMatch = req.headers.get("if-none-match");

    if (ifNoneMatch === etag && !rangeHeader) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          "ETag": etag,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    const client = getR2Client();

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    });

    const r2 = await client.send(command);
    if (!r2.Body) {
      return new NextResponse("Media not found", { status: 404 });
    }

    const isHeic = key.match(/\.(heic|heif)$/i) || r2.ContentType?.match(/heic|heif/i);
    if (isHeic) {
      try {
        const byteArray = await r2.Body.transformToByteArray();
        const buffer = Buffer.from(byteArray);
        const sharpModule = await import("sharp");
        const sharp = sharpModule.default ?? sharpModule;
        const converted = await sharp(buffer).webp({ quality: 85 }).toBuffer();

        return new NextResponse(converted, {
          status: 200,
          headers: {
            "Content-Type": "image/webp",
            "Content-Length": String(converted.length),
            "Cache-Control": "public, max-age=31536000, immutable",
            "ETag": etag,
          },
        });
      } catch (heicErr) {
        console.error("[api/media] HEIC conversion failed, falling back:", heicErr);
      }
    }

    const isVideo = key.match(/\.(mp4|webm|mov|mkv|avi|3gp|mpeg|wmv|m4v)$/i) || r2.ContentType?.startsWith("video/");

    const headers: Record<string, string> = {
      "Content-Type": r2.ContentType || (isVideo ? "video/mp4" : "image/jpeg"),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=31536000, immutable",
      "ETag": etag,
    };

    if (r2.ContentLength !== undefined) {
      headers["Content-Length"] = String(r2.ContentLength);
    }
    if (r2.ContentRange) {
      headers["Content-Range"] = r2.ContentRange;
    }

    const webStream = r2.Body.transformToWebStream();

    return new NextResponse(webStream, {
      status: rangeHeader ? 206 : 200,
      headers,
    });
  } catch (err: unknown) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) {
      return new NextResponse("Media not found", { status: 404 });
    }
    console.error("[api/media GET]", err);
    return new NextResponse("Server Error", { status: 500 });
  }
}
