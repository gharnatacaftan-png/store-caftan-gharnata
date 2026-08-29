import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function setCors() {
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });

  const bucket = process.env.R2_BUCKET_NAME || "caftan-gharnata-media";

  const command = new PutBucketCorsCommand({
    Bucket: bucket,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedHeaders: ["*"],
          AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
          AllowedOrigins: ["*"], // For development/testing
          ExposeHeaders: ["ETag", "Content-Length", "Content-Type"],
          MaxAgeSeconds: 3000,
        },
      ],
    },
  });

  try {
    await client.send(command);
    console.log(`✅ CORS successfully configured for R2 bucket: ${bucket}`);
  } catch (err) {
    console.error("❌ Failed to set CORS:", err);
  }
}

setCors();
