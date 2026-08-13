// app/api/media/[...key]/route.ts — Media & Video Streaming Proxy for Cloudflare R2 Assets
import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export const runtime = "nodejs";

function getR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

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
