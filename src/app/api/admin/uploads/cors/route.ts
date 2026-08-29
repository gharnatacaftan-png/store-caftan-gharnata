// app/api/admin/uploads/cors/route.ts
//
// One-time CORS configuration for the Cloudflare R2 bucket.
// Run this ONCE after deploying to allow browsers to PUT files directly
// to R2 (used by the presigned upload architecture).
//
// Usage:
//   1. Log in as admin on the site
//   2. Visit: /api/admin/uploads/cors
//   3. You should see: { "ok": true, "message": "CORS configured" }
//   4. Done — this never needs to be run again

import { NextRequest, NextResponse } from "next/server";
import { PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "@/lib/r2";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Admin-only — must be logged in
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const bucket = process.env.R2_BUCKET_NAME || "caftan-gharnata-media";

  try {
    const client = getR2Client();

    // Configure CORS to allow browsers to upload directly to R2
    // AllowedOrigins: ["*"] — works for any domain (store, admin, etc.)
    await client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ["*"],
              AllowedMethods: ["GET", "PUT", "POST", "HEAD"],
              AllowedOrigins: ["*"],
              ExposeHeaders: ["ETag", "Content-Length"],
              MaxAgeSeconds: 86400, // 24h browser cache for the preflight response
            },
          ],
        },
      })
    );

    // Verify it was saved correctly
    const verify = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    const rules = verify.CORSRules ?? [];

    console.log(`[cors-setup] ✅ CORS configured for bucket "${bucket}"`, JSON.stringify(rules));

    return NextResponse.json({
      ok: true,
      message: `✅ CORS configured for R2 bucket: ${bucket}`,
      rules,
    });
  } catch (error: any) {
    console.error("[cors-setup] ❌", error);
    return NextResponse.json(
      { ok: false, error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
