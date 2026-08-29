import { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { getR2Client } from "@/lib/r2";
import { CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from "@aws-sdk/client-s3";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import { rateLimit, getClientIp, okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";

const BUCKET = process.env.R2_BUCKET_NAME || "caftan-gharnata-media";
const R2_PUBLIC_BASE = (process.env.R2_PUBLIC_URL || "https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev").replace(/\/$/, "");

// 1. POST: Start Multipart Upload
export async function POST(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const ip = getClientIp(req);
  if (!rateLimit(`admin-upload-start:${ip}`, { windowMs: 60_000, max: 20 })) {
    return errorResponse("Too many upload requests.", 429);
  }

  try {
    const { fileName, fileType } = await req.json();
    if (!fileName) return errorResponse("Nom de fichier manquant", 400);

    const ext = path.extname(fileName).toLowerCase() || ".mp4";
    const key = `uploads/videos/${Date.now()}-${uuidv4()}${ext}`;

    const client = getR2Client();
    const command = new CreateMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: fileType || "video/mp4",
    });

    const response = await client.send(command);
    if (!response.UploadId) throw new Error("Échec de création du Multipart Upload");

    return okResponse({
      ok: true,
      uploadId: response.UploadId,
      key,
    });
  } catch (error) {
    console.error("[multipart start]", error);
    return errorResponse("Erreur serveur", 500);
  }
}

// 2. PUT: Upload a single chunk (Part)
export async function PUT(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  try {
    const uploadId = req.nextUrl.searchParams.get("uploadId");
    const key = req.nextUrl.searchParams.get("key");
    const partNumberStr = req.nextUrl.searchParams.get("partNumber");

    if (!uploadId || !key || !partNumberStr) {
      return errorResponse("Paramètres manquants", 400);
    }

    const partNumber = parseInt(partNumberStr, 10);
    
    // Read the chunk from the request body
    const arrayBuffer = await req.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length > 4.5 * 1024 * 1024) {
      return errorResponse("Chunk trop grand (max 4.5MB)", 413);
    }

    const client = getR2Client();
    const command = new UploadPartCommand({
      Bucket: BUCKET,
      Key: key,
      PartNumber: partNumber,
      UploadId: uploadId,
      Body: buffer,
    });

    const response = await client.send(command);

    return okResponse({
      ok: true,
      eTag: response.ETag, // Must be saved by the client to complete the upload
    });
  } catch (error) {
    console.error("[multipart chunk]", error);
    return errorResponse("Erreur serveur", 500);
  }
}

// 3. PATCH: Complete or Abort the Multipart Upload
export async function PATCH(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  try {
    const { uploadId, key, parts, abort } = await req.json();

    if (!uploadId || !key) {
      return errorResponse("Paramètres manquants", 400);
    }

    const client = getR2Client();

    if (abort) {
      await client.send(new AbortMultipartUploadCommand({ Bucket: BUCKET, Key: key, UploadId: uploadId }));
      return okResponse({ ok: true, message: "Upload annulé" });
    }

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return errorResponse("Parts manquantes pour finaliser l'upload", 400);
    }

    const command = new CompleteMultipartUploadCommand({
      Bucket: BUCKET,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p: any) => ({
          ETag: p.eTag,
          PartNumber: p.partNumber,
        })),
      },
    });

    await client.send(command);

    const publicUrl = `${R2_PUBLIC_BASE}/${key}`;

    return okResponse({
      ok: true,
      url: publicUrl,
    });
  } catch (error) {
    console.error("[multipart complete]", error);
    return errorResponse("Erreur serveur", 500);
  }
}
