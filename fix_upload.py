import re

# Read the file
with open(r'C:\Users\Larabi Mohamed\Desktop\prototype caftan\src\app\gharnata-portal-x92\products\ProductsClient.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

new_section = '''function getVideoProxyUrl(url: string): string {
  if (!url) return "";
  const direct = fixMediaUrl(url);
  if (!direct) return "";
  return direct.includes("#t=") ? direct : `${direct}#t=0.1`;
}

  // ═════════════════════════════════════════════════════════════════════════════════
  // NEW CLEAN UPLOAD SYSTEM — Direct to R2 via Presigned URLs
  // ════════════════════════════════════════════════════════════════════════════════
  //
  // Architecture:
  //   1. Request presigned URLs from /api/admin/upload (POST with file metadata)
  //   2. Browser uploads DIRECTLY to R2 using presigned PUT URLs
  //   3. Confirm completion with /api/admin/upload (PATCH with keys)
  //   4. Server optimizes images (sharp handles HEIC/HEIF natively)
  //   5. Store R2 keys in state, display via /api/media/ proxy (works on Djezzy)
  //
  // Benefits:
  //   ✅ No file size limits (500MB+) — bypasses Vercel 4.5MB limit completely
  //   ✅ No client-side compression — server handles ALL formats including HEIC/HEIF
  //   ✅ No chunking complexity — single PUT request per file
  //   ✅ Works on all devices: PC, iPhone, Android, any network
  //   ✅ Progress events via XHR for upload feedback
  //   ✅ Sequential uploads with breathing room for mobile RAM
  // ════════════════════════════════════════════════════════════════════════════════

  interface UploadFileResult {
    key: string;
    presignedUrl: string;
    publicUrl: string;
    mimeType: string;
    kind: "image" | "video";
    originalName: string;
    size: number;
  }

  interface ConfirmedFileResult {
    key: string;
    url: string;
    mimeType: string;
    size: number;
    kind: "image" | "video";
  }

  async function requestPresignedUrls(
    files: File[],
    sessionHdrs: Record<string, string>
  ): Promise<UploadFileResult[]> {
    const fileInfos = files.map(f => ({
      name: f.name,
      type: f.type || "application/octet-stream",
      size: f.size,
    }));

    const res = await fetch("/api/admin/upload", {
      method: "POST",
      headers: { ...sessionHdrs, "Content-Type": "application/json" },
      body: JSON.stringify({ files: fileInfos }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Presign failed" }));
      throw new Error(err.error || `Presign failed: ${res.status}`);
    }

    const data = await res.json();
    if (!data.ok || !data.files?.length) {
      throw new Error(data.error || "No presigned URLs returned");
    }

    return data.files;
  }

  async function uploadToR2(
    file: File,
    presignedUrl: string,
    onProgress?: (pct: number, loadedMb: number, totalMb: number) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", presignedUrl, true);

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const pct = Math.round((e.loaded / e.total) * 100);
          const loadedMb = e.loaded / 1024 / 1024;
          const totalMb = e.total / 1024 / 1024;
          onProgress(pct, loadedMb, totalMb);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Upload failed: HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.ontimeout = () => reject(new Error("Upload timeout"));
      xhr.send(file);
    });
  }

  async function confirmUploads(
    keys: string[],
    sessionHdrs: Record<string, string>
  ): Promise<ConfirmedFileResult[]> {
    const res = await fetch("/api/admin/upload", {
      method: "PATCH",
      headers: { ...sessionHdrs, "Content-Type": "application/json" },
      body: JSON.stringify({ keys }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Confirm failed" }));
      throw new Error(err.error || `Confirm failed: ${res.status}`);
    }

    const data = await res.json();
    if (!data.ok || !data.files?.length) {
      throw new Error(data.error || "No confirmed files returned");
    }

    return data.files;
  }

  // ─── PRIMARY IMAGE UPLOAD ─────────────────────────────────────────────────
  async function handlePrimaryUpload(files: FileList | null) {
    if (!files || !files[0]) return;
    const rawFile = files[0];
    setUploadingPrimary(true);

    // Show LOCAL preview immediately — works for ALL formats including HEIC
    const localPreview = URL.createObjectURL(rawFile);
    setForm(f => ({ ...f, primary_image: localPreview }));

    try {
      const hdrs = await csrfHeaders();
      setUploadStatusTextPrimary(`⚡ Préparation de l'upload…`);

      // 1. Get presigned URL
      const [presigned] = await requestPresignedUrls([rawFile], hdrs);
      
      setUploadStatusTextPrimary(`⚡ Envoi vers le stockage…`);

      // 2. Upload directly to R2
      await uploadToR2(rawFile, presigned.presignedUrl, (pct, loadedMb, totalMb) => {
        setUploadStatusTextPrimary(
          `⬆️ Upload (${pct}%) — ${loadedMb.toFixed(1)} / ${totalMb.toFixed(1)} MB`
        );
      });

      // 3. Confirm & get optimized result
      setUploadStatusTextPrimary(`⚡ Optimisation serveur…`);
      const [confirmed] = await confirmUploads([presigned.key], hdrs);

      // 4. Use proxy URL for display (works on Djezzy/mobile)
      const proxyUrl = `/api/media/${confirmed.key}`;
      setForm(f => ({ ...f, primary_image: proxyUrl }));
      URL.revokeObjectURL(localPreview);
      setUploadStatusTextPrimary("✅ Photo uploadée et optimisée!");
      console.log("[primary upload] ✅", proxyUrl);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[primary upload] ❌", e);
      // Keep local preview on error
      setUploadStatusTextPrimary(`❌ ${msg}`);
    } finally {
      setUploadingPrimary(false);
      setTimeout(() => setUploadStatusTextPrimary(""), 5000);
    }
  }

  // ─── GALLERY UPLOAD (images + videos) ────────────────────────────────────

  async function handleGalleryUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setUploadingGallery(true);
    let successCount = 0;
    const errors: string[] = [];

    // Collect ALL results first, then flush to state once at the end
    const newImages: string[] = [];
    const newVideos: string[] = [];

    try {
      const hdrs = await csrfHeaders();

      // 1. Get ALL presigned URLs upfront
      setUploadStatusTextGallery(`⚡ Préparation de ${fileList.length} fichier(s)…`);
      const presignedFiles = await requestPresignedUrls(fileList, hdrs);

      // 2. Upload each file sequentially to R2
      for (let i = 0; i < presignedFiles.length; i++) {
        const presigned = presignedFiles[i];
        const rawFile = fileList[i];
        const kind = presigned.kind === "video" ? "Vidéo" : "Image";

        try {
          setUploadStatusTextGallery(`⚡ Envoi ${kind} ${i + 1}/${fileList.length}…`);

          await uploadToR2(rawFile, presigned.presignedUrl, (pct, loadedMb, totalMb) => {
            setUploadStatusTextGallery(
              `⬆️ ${kind} ${i + 1}/${fileList.length} (${pct}%) — ${loadedMb.toFixed(1)} / ${totalMb.toFixed(1)} MB`
            );
          });

          console.log(`[gallery] ✅ ${kind} ${i + 1} uploaded to R2`);

          successCount++;
          setUploadStatusTextGallery(`✅ ${kind} ${i + 1}/${fileList.length} envoyé`);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[gallery] ❌ ${kind} ${i + 1}:`, e);
          errors.push(`${kind} ${i + 1}: ${msg}`);
          setUploadStatusTextGallery(`❌ ${kind} ${i + 1}: ${msg}`);
        }

        // Breathing room for mobile RAM
        if (i < presignedFiles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // 3. Confirm ALL uploads at once, get optimized results
      if (successCount > 0) {
        setUploadStatusTextGallery(`⚡ Optimisation serveur…`);
        const keys = presignedFiles.slice(0, successCount).map(f => f.key);
        const confirmed = await confirmUploads(keys, hdrs);

        // 4. Convert to proxy URLs and accumulate
        for (const file of confirmed) {
          const proxyUrl = `/api/media/${file.key}`;
          if (file.kind === "video") {
            newVideos.push(proxyUrl);
          } else {
            newImages.push(proxyUrl);
          }
        }

        // 5. SINGLE state flush — all files saved atomically
        if (newImages.length > 0 || newVideos.length > 0) {
          setForm(f => ({
            ...f,
            images: [...f.images, ...newImages],
            videos: [...(f.videos || []), ...newVideos],
          }));
        }
      } else if (errors.length > 0) {
        setUploadStatusTextGallery(
          `⚠️ ${errors.length} erreur(s): ${errors.join("; ")}`
        );
      }
    } finally {
      setUploadingGallery(false);
      if (successCount > 0 && errors.length === 0) {
        setUploadStatusTextGallery(`✅ ${successCount} fichier(s) uploadé(s) et optimisés`);
        setTimeout(() => setUploadStatusTextGallery(""), 4000);
      } else if (errors.length > 0) {
        setUploadStatusTextGallery(
          `⚠️ ${successCount} OK — ${errors.length} erreur(s): ${errors[0]}`
        );
      }
    }
  }'''

# Exact indices from analysis
start_idx = 16230
end_idx = 26958

print(f"Start index: {start_idx}")
print(f"End index: {end_idx}")

# Extract the parts
before = content[:start_idx]
after = content[end_idx:]

# Verify we have the right content
old_section = content[start_idx:end_idx]
print(f"Old section length: {len(old_section)}")
print(f"Old section preview: {old_section[:200]}")

# Build new content
new_content = before + new_section + "\n\n" + after

# Write the file
with open(r'C:\Users\Larabi Mohamed\Desktop\prototype caftan\src\app\gharnata-portal-x92\products\ProductsClient.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("SUCCESS: File written")