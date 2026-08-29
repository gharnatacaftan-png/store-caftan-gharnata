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
import { requireAdminSession } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  // Admin session check — works with a simple browser GET (no CSRF needed for read-like operations)
  const session = await requireAdminSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Non autorisé — veuillez vous connecter à l'admin d'abord" },
      { status: 401 }
    );
  }

  const bucket = process.env.R2_BUCKET_NAME || "caftan-gharnata-media";

  try {
    const client = getR2Client();

    // Configure CORS so browsers can upload directly to R2 from any domain
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
              MaxAgeSeconds: 86400,
            },
          ],
        },
      })
    );

    // Verify it was saved correctly
    const verify = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    const rules = verify.CORSRules ?? [];

    console.log(`[cors-setup] ✅ CORS configured for bucket "${bucket}"`);

    return NextResponse.json({
      ok: true,
      message: `✅ CORS configuré avec succès pour le bucket R2: ${bucket}`,
      rules,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[cors-setup] ❌", error);
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500 }
    );
  }
}
