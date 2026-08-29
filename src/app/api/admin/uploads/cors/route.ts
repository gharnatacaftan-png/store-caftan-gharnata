// app/api/admin/uploads/cors/route.ts
//
// One-time CORS configuration for the Cloudflare R2 bucket.
// Allows browsers to PUT files directly to R2 (presigned upload architecture).
//
// Usage (two methods):
//
// Method 1 — Secret token (recommended, no login needed):
//   /api/admin/uploads/cors?secret=YOUR_SESSION_SECRET
//
// Method 2 — Logged-in admin session:
//   /api/admin/uploads/cors  (while logged in to admin panel)

import { NextRequest, NextResponse } from "next/server";
import { PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";
import { getR2Client } from "@/lib/r2";
import { requireAdminSession } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Auth Method 1: Secret token passed as query param (bypasses cookie issues)
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");
  const expectedSecret = process.env.SESSION_SECRET || "";

  const hasValidSecret = secret && expectedSecret && secret === expectedSecret;

  // Auth Method 2: Admin session cookie
  const session = hasValidSecret ? true : await requireAdminSession();

  if (!session) {
    return NextResponse.json(
      {
        ok: false,
        error: "Non autorisé. Ajoutez ?secret=VOTRE_SESSION_SECRET à l'URL",
      },
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

    // Verify it was saved
    const verify = await client.send(new GetBucketCorsCommand({ Bucket: bucket }));
    const rules = verify.CORSRules ?? [];

    console.log(`[cors-setup] ✅ CORS configured for bucket "${bucket}"`);

    return NextResponse.json({
      ok: true,
      message: `✅ CORS configuré avec succès pour: ${bucket}`,
      rules,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[cors-setup] ❌", error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
