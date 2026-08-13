#!/usr/bin/env node
// scripts/optimize-existing-images.js — One-time cleanup: re-encode every image
// already stored in R2 (hero, category images, product media) with the same
// sharp pipeline the upload route now uses, update D1 to point at the new
// optimized object, and delete the old (heavy) object.
//
// Run: node scripts/optimize-existing-images.js
//
// Idempotent-safe: each pass re-downloads and re-optimizes. Images that are
// already small/optimized will simply be re-encoded to (roughly) the same size —
// there is no "already done" marker, so running it twice just rewrites the keys.

const fs   = require("fs");
const path = require("path");
const https = require("https");
const crypto = require("crypto");
const sharp = require("sharp");
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", ".env.local");
fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return;
  const eq = t.indexOf("=");
  if (eq < 0) return;
  process.env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^\\/, "");
});

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DB_ID      = process.env.CLOUDFLARE_D1_DATABASE_ID;
const TOKEN      = process.env.CLOUDFLARE_D1_TOKEN;
const PUBLIC_BASE = (process.env.R2_PUBLIC_URL || "https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev").replace(/\/$/, "");

if (!ACCOUNT_ID || !DB_ID || !TOKEN) { console.error("❌ Missing env vars"); process.exit(1); }

// ── D1 helper (REST API, supports parameters) ────────────────────────────────
function d1(sql, params = []) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql, params });
    const options = {
      hostname: "api.cloudflare.com",
      path: `/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.success) resolve(json.result?.[0]?.results ?? []);
          else reject(json.errors || json);
        } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── HTTPS download (follows a few redirects) ─────────────────────────────────
function download(url) {
  return new Promise((resolve, reject) => {
    const get = (u, depth) => {
      if (depth > 4) return reject(new Error("too many redirects"));
      https.get(u, res => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return get(res.headers.location, depth + 1);
        }
        if (res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        const chunks = [];
        res.on("data", c => chunks.push(c));
        res.on("end", () => resolve(Buffer.concat(chunks)));
        res.on("error", reject);
      }).on("error", reject);
    };
    get(url, 0);
  });
}

// ── R2 S3 client ─────────────────────────────────────────────────────────────
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME || "caftan-granada-media";

async function putObject(key, body, contentType) {
  await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType, ContentLength: body.length }));
}
async function deleteObject(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

function r2KeyFromUrl(url) {
  if (!url) return null;
  const clean = url.trim();
  if (clean.startsWith(`${PUBLIC_BASE}/`)) return clean.slice(`${PUBLIC_BASE}/`.length);
  if (clean.startsWith("/api/media/")) return clean.slice("/api/media/".length);
  return null;
}

// ── Same sharp pipeline as src/lib/image-optimize.ts ─────────────────────────
const MAX_DIM = 1920, QUALITY = 82;

async function optimize(buf, mime) {
  try {
    const meta = await sharp(buf).metadata();
    if (meta.format === "gif" || (meta.pages && meta.pages > 1)) {
      return { buffer: buf, contentType: mime, ext: ".gif" };
    }
    let image = sharp(buf);
    const longest = Math.max(meta.width || 0, meta.height || 0);
    if (longest > MAX_DIM) image = image.resize({ width: MAX_DIM, height: MAX_DIM, fit: "inside", withoutEnlargement: true });

    const format = String(meta.format || "").toLowerCase();
    switch (format) {
      case "png": return { buffer: await image.webp({ quality: QUALITY }).toBuffer(), contentType: "image/webp", ext: ".webp" };
      case "jpeg": return { buffer: await image.jpeg({ quality: QUALITY, mozjpeg: true }).toBuffer(), contentType: "image/jpeg", ext: ".jpg" };
      case "webp": return { buffer: await image.webp({ quality: QUALITY }).toBuffer(), contentType: "image/webp", ext: ".webp" };
      case "avif": return { buffer: await image.avif({ quality: QUALITY }).toBuffer(), contentType: "image/avif", ext: ".avif" };
      default: return { buffer: buf, contentType: mime, ext: ".jpg" };
    }
  } catch {
    return { buffer: buf, contentType: mime, ext: ".jpg" };
  }
}

// ── Main ─────────────────────────────────────────────────────────────────────
(async () => {
  const targets = [];

  const hero = await d1(`SELECT hero_image FROM site_settings WHERE id = 'store'`);
  if (hero[0]?.hero_image) targets.push({ kind: "hero", url: hero[0].hero_image });

  const cats = await d1(`SELECT id, image_url FROM categories`);
  for (const c of cats) if (c.image_url) targets.push({ kind: "category", id: c.id, url: c.image_url });

  const media = await d1(`SELECT id, product_id, r2_key, r2_url, file_size_bytes FROM product_media WHERE file_type = 'IMAGE'`);
  for (const m of media) targets.push({ kind: "media", id: m.id, product_id: m.product_id, url: m.r2_url, oldSize: m.file_size_bytes || 0 });

  console.log(`📦 ${targets.length} image(s) to optimize...\n`);

  let totalSaved = 0;
  let done = 0;

  for (const t of targets) {
    const oldKey = r2KeyFromUrl(t.url);
    if (!oldKey) { console.log(`⏭  skip (not ours): ${t.url}`); continue; }

    try {
      // Legacy rows may store a relative /api/media/... proxy path — the object
      // itself lives in R2, so resolve it to the full public URL for download.
      const srcUrl = t.url.startsWith("/api/media/")
        ? `${PUBLIC_BASE}/${t.url.slice("/api/media/".length)}`
        : t.url;
      const raw = await download(srcUrl);
      const { buffer, contentType, ext } = await optimize(raw, "");
      if (buffer.length >= raw.length && raw.length < 300 * 1024) {
        // Already small & not reduced — leave it untouched to avoid churn.
        console.log(`⏭  ${t.kind} already small (${(raw.length/1024).toFixed(0)}KB)`);
        continue;
      }

      const newKey = `uploads/${Date.now()}-${crypto.randomUUID()}${ext}`;
      const newUrl = `${PUBLIC_BASE}/${newKey}`;

      await putObject(newKey, buffer, contentType);

      if (t.kind === "hero") {
        await d1(`UPDATE site_settings SET hero_image = ? WHERE id = 'store'`, [newUrl]);
      } else if (t.kind === "category") {
        await d1(`UPDATE categories SET image_url = ? WHERE id = ?`, [newUrl, t.id]);
      } else if (t.kind === "media") {
        await d1(`UPDATE product_media SET r2_key = ?, r2_url = ?, file_size_bytes = ? WHERE id = ?`,
          [newKey, newUrl, buffer.length, t.id]);
        if (t.product_id) {
          await d1(`UPDATE products SET total_media_bytes = total_media_bytes - ? + ? WHERE id = ?`,
            [t.oldSize, buffer.length, t.product_id]);
        }
      }

      await deleteObject(oldKey);
      const saved = raw.length - buffer.length;
      totalSaved += Math.max(0, saved);
      done++;
      console.log(`✅ ${t.kind.padEnd(9)} ${(raw.length/1024).toFixed(0).padStart(5)}KB → ${(buffer.length/1024).toFixed(0).padStart(4)}KB  (${(saved/1024).toFixed(0)}KB saved)  ${newKey.split("/").pop().slice(0, 18)}…`);
    } catch (err) {
      console.log(`❌ ${t.kind} failed: ${err.message} — skipping (D1 untouched)`);
    }
  }

  console.log(`\n🎉 Done: ${done} optimized · ~${(totalSaved/1024/1024).toFixed(1)}MB freed`);
})().catch(e => { console.error("Fatal:", e); process.exit(1); });
