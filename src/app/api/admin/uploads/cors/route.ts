import { NextRequest, NextResponse } from "next/server";
import { PutBucketCorsCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "@/lib/r2";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Protect this route
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  try {
    const client = getR2Client();
    const bucket = process.env.R2_BUCKET_NAME || "caftan-gharnata-media";

    const command = new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          {
            AllowedHeaders: ["*"],
            AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
            AllowedOrigins: ["*"],
            ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    });

    await client.send(command);

    return NextResponse.json({
      ok: true,
      message: `CORS successfully configured for R2 bucket: ${bucket}`,
    });
  } catch (error: any) {
    console.error("[CORS Setup Error]", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
