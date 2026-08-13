// app/api/stream/[...key]/route.ts
// Proper video streaming proxy with HTTP Range Request support.
// R2 Public URLs lack CORS headers needed for <video> Range requests.
// This route fetches from R2 server-side (no CORS) and streams back.

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
    const key = resolvedParams.key?.join("/") || "";

    if (!key) {
      return new NextResponse("Key required", { status: 400 });
    }

    const rangeHeader = req.headers.get("range");

    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ...(rangeHeader ? { Range: rangeHeader } : {}),
    });

    const r2 = await client.send(command);

    if (!r2.Body) {
      return new NextResponse("Not found", { status: 404 });
    }

    const headers: Record<string, string> = {
      "Content-Type": r2.ContentType || "video/mp4",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
    };

    if (r2.ContentLength !== undefined) {
      headers["Content-Length"] = String(r2.ContentLength);
    }
    if (r2.ContentRange) {
      headers["Content-Range"] = r2.ContentRange;
    }

    // True streaming — no memory buffering
    const webStream = r2.Body.transformToWebStream();

    return new NextResponse(webStream, {
      status: rangeHeader ? 206 : 200,
      headers,
    });
  } catch (err: unknown) {
    const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (e.name === "NoSuchKey" || e.$metadata?.httpStatusCode === 404) {
      return new NextResponse("Not found", { status: 404 });
    }
    console.error("[stream]", err);
    return new NextResponse("Stream error", { status: 500 });
  }
}
