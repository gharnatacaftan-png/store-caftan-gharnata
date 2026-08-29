import "server-only";
// lib/products-db.ts — Products CRUD using D1
//
// ARCHITECTURE RULE:
//   r2_url stored in D1 is ALWAYS the full Cloudflare R2 public URL.
//   No normalisation, no rewriting. Use the URL as-is.
//
import { d1Query, d1QueryFirst, d1Execute } from "./db";
import { r2Delete } from "./r2";
import { ProductCategory } from "./types";

export interface DBProductMediaItem {
  r2_url: string;
  r2_key?: string;
  file_type?: "IMAGE" | "VIDEO";
  file_size_bytes?: number;
  is_primary?: boolean;
}

export interface DBProduct {
  id: number;
  category_id: number;
  category_slug: ProductCategory;
  category_name_ar: string;
  title: string;
  title_fr: string;
  title_en: string;
  description: string;
  description_fr: string;
  description_en: string;
  price: number;
  sizes: string[];
  colors: Array<{ id: string; name: string; value: string }>;
  /** Map of colorId → array of media URLs (images or videos) linked to that color */
  color_media_map: Record<string, string[]>;
  is_active: boolean;
  is_featured: boolean;
  total_media_bytes: number;
  created_at: string;
  images: string[];
  videos: string[];
  primary_image: string | null;
}

// ---------------------------------------------------------------------------
// Repair URLs that were mistakenly stored as /api/media/... proxy paths.
// If the URL is already a full https:// URL, return as-is.
// ---------------------------------------------------------------------------
const R2_PUBLIC_BASE = (process.env.R2_PUBLIC_URL || "https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev").replace(/\/$/, "");

function repairUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim();

  if (clean.startsWith("/api/media/")) return clean;

  if (clean.includes("pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev/")) {
    clean = clean.split("pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev/")[1];
  } else if (clean.includes(".r2.dev/")) {
    const idx = clean.indexOf(".r2.dev/");
    clean = clean.slice(idx + 8);
  }

  // External URLs (Instagram, TikTok, YouTube, non-R2 CDNs) stay as-is
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;

  return `/api/media/${clean.replace(/^\/+/, "")}`;
}

// Helper: parse a DBProduct row from raw SQL result
function parseProduct(
  row: Record<string, unknown>,
  mediaRows: Array<{ r2_url: string; file_type: string; is_primary: boolean }> = []
): DBProduct {
  const images = mediaRows.filter(m => m.file_type === "IMAGE").map(m => repairUrl(m.r2_url));
  const videos = mediaRows.filter(m => m.file_type === "VIDEO").map(m => repairUrl(m.r2_url));
  const primaryRow = mediaRows.find(m => Boolean(m.is_primary) && m.file_type === "IMAGE");
  const primary = repairUrl(primaryRow?.r2_url ?? images[0] ?? "");

  let color_media_map: Record<string, string[]> = {};
  try {
    const raw = (row.color_media_map as string) ?? "{}";
    color_media_map = JSON.parse(raw);
  } catch { color_media_map = {}; }

  return {
    id: row.id as number,
    category_id: row.category_id as number,
    category_slug: row.slug as ProductCategory,
    category_name_ar: row.name_ar as string,
    title: row.title as string,
    title_fr: (row.title_fr as string) ?? "",
    title_en: (row.title_en as string) ?? "",
    description: (row.description as string) ?? "",
    description_fr: (row.description_fr as string) ?? "",
    description_en: (row.description_en as string) ?? "",
    price: row.price as number,
    sizes: JSON.parse((row.sizes as string) ?? '["S","M","L","XL","XXL"]'),
    colors: JSON.parse((row.colors as string) ?? "[]"),
    color_media_map,
    is_active: Boolean(row.is_active),
    is_featured: Boolean(row.is_featured),
    total_media_bytes: (row.total_media_bytes as number) ?? 0,
    created_at: row.created_at as string,
    images,
    videos,
    primary_image: primary,
  };
}

// ---------------------------------------------------------------------------
// GET ALL
// ---------------------------------------------------------------------------
export async function dbGetAllProducts(onlyActive = false): Promise<DBProduct[]> {
  const whereClause = onlyActive ? "WHERE p.is_active = TRUE" : "";
  const rows = await d1Query<Record<string, unknown>>(`
    SELECT p.*, c.slug, c.name_ar
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ${whereClause}
    ORDER BY p.created_at DESC
  `);

  if (rows.length === 0) return [];

  const ids = rows.map(r => r.id as number);
  const placeholders = ids.map(() => "?").join(",");
  const mediaRows = await d1Query<{ product_id: number; r2_url: string; file_type: string; is_primary: number }>(
    `SELECT product_id, r2_url, file_type, is_primary FROM product_media WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`,
    ids
  );

  return rows.map(row => {
    const media = mediaRows
      .filter(m => m.product_id === (row.id as number))
      .map(m => ({ r2_url: m.r2_url, file_type: m.file_type, is_primary: Boolean(m.is_primary) }));
    return parseProduct(row, media);
  });
}

// ---------------------------------------------------------------------------
// GET ONE BY ID
// ---------------------------------------------------------------------------
export async function dbGetProductById(id: number): Promise<DBProduct | null> {
  const row = await d1QueryFirst<Record<string, unknown>>(
    `SELECT p.*, c.slug, c.name_ar FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?`,
    [id]
  );
  if (!row) return null;

  const media = await d1Query<{ r2_url: string; file_type: string; is_primary: number }>(
    `SELECT r2_url, file_type, is_primary FROM product_media WHERE product_id = ? ORDER BY sort_order ASC, id ASC`,
    [id]
  );

  return parseProduct(row, media.map(m => ({ r2_url: m.r2_url, file_type: m.file_type, is_primary: Boolean(m.is_primary) })));
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------
export async function dbCreateProduct(data: {
  category_id: number;
  title: string;
  title_fr?: string;
  title_en?: string;
  description?: string;
  description_fr?: string;
  description_en?: string;
  price: number;
  sizes?: string[];
  colors?: Array<{ id: string; name: string; value: string }>;
  color_media_map?: Record<string, string[]>;
  is_featured?: boolean;
}): Promise<number> {
  const meta = await d1Execute(
    `INSERT INTO products (category_id, title, title_fr, title_en, description, description_fr, description_en, price, sizes, colors, color_media_map, is_featured)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.category_id,
      data.title,
      data.title_fr ?? "",
      data.title_en ?? "",
      data.description ?? "",
      data.description_fr ?? "",
      data.description_en ?? "",
      data.price,
      JSON.stringify(data.sizes ?? []),
      JSON.stringify(data.colors ?? []),
      JSON.stringify(data.color_media_map ?? {}),
      data.is_featured ? 1 : 0,
    ]
  );
  return meta.last_row_id;
}

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------
export async function dbUpdateProduct(
  id: number,
  data: Partial<{
    category_id: number;
    title: string;
    title_fr: string;
    title_en: string;
    description: string;
    description_fr: string;
    description_en: string;
    price: number;
    sizes: string[];
    colors: Array<{ id: string; name: string; value: string }>;
    color_media_map: Record<string, string[]>;
    is_active: boolean;
    is_featured: boolean;
  }>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (data.category_id !== undefined) { fields.push("category_id = ?"); values.push(data.category_id); }
  if (data.title !== undefined) { fields.push("title = ?"); values.push(data.title); }
  if (data.title_fr !== undefined) { fields.push("title_fr = ?"); values.push(data.title_fr); }
  if (data.title_en !== undefined) { fields.push("title_en = ?"); values.push(data.title_en); }
  if (data.description !== undefined) { fields.push("description = ?"); values.push(data.description); }
  if (data.description_fr !== undefined) { fields.push("description_fr = ?"); values.push(data.description_fr); }
  if (data.description_en !== undefined) { fields.push("description_en = ?"); values.push(data.description_en); }
  if (data.price !== undefined) { fields.push("price = ?"); values.push(data.price); }
  if (data.sizes !== undefined) { fields.push("sizes = ?"); values.push(JSON.stringify(data.sizes)); }
  if (data.colors !== undefined) { fields.push("colors = ?"); values.push(JSON.stringify(data.colors)); }
  if (data.color_media_map !== undefined) { fields.push("color_media_map = ?"); values.push(JSON.stringify(data.color_media_map)); }
  if (data.is_active !== undefined) { fields.push("is_active = ?"); values.push(data.is_active ? 1 : 0); }
  if (data.is_featured !== undefined) { fields.push("is_featured = ?"); values.push(data.is_featured ? 1 : 0); }

  if (fields.length === 0) return;
  values.push(id);

  await d1Execute(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, values);
}

import { extractKey } from "./storage-db";

// ---------------------------------------------------------------------------
// REPLACE PRODUCT MEDIA (Bulk update product_media table + clean removed R2 files)
// ---------------------------------------------------------------------------
export async function dbReplaceProductMedia(
  productId: number,
  items: DBProductMediaItem[]
): Promise<void> {
  // 1. Fetch current media entries to detect removed files
  const existingMedia = await d1Query<{ r2_key: string; r2_url: string }>(
    `SELECT r2_key, r2_url FROM product_media WHERE product_id = ?`,
    [productId]
  );

  const newUrlsSet = new Set(items.map(it => it.r2_url).filter(Boolean));

  // 2. Delete files from R2 that are no longer part of the product
  for (const old of existingMedia) {
    const oldUrl = old.r2_url || old.r2_key;
    if (oldUrl && !newUrlsSet.has(oldUrl)) {
      const k = extractKey(old.r2_key, old.r2_url);
      if (k) {
        await r2Delete(k).catch((err: unknown) => console.error("[R2 edit cleanup error]", err));
      }
    }
  }

  // 3. Clear existing media entries
  await d1Execute(`DELETE FROM product_media WHERE product_id = ?`, [productId]);

  let totalBytes = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const url = item.r2_url;
    if (!url) continue;
    const key = item.r2_key || url;
    const fileType = item.file_type || (url.match(/\.(mp4|webm|mov|mkv|avi|3gp|mpeg|wmv|m4v)$/i) ? "VIDEO" : "IMAGE");
    const sizeBytes = item.file_size_bytes ?? 0;
    const isPrimary = item.is_primary ?? (i === 0 && fileType === "IMAGE");

    await d1Execute(
      `INSERT INTO product_media (product_id, r2_key, r2_url, file_type, file_size_bytes, is_primary, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productId, key, url, fileType, sizeBytes, isPrimary ? 1 : 0, i]
    );

    totalBytes += sizeBytes;
  }

  // Update total_media_bytes on product table
  await d1Execute(
    `UPDATE products SET total_media_bytes = ? WHERE id = ?`,
    [totalBytes, productId]
  );
}

import { dbDeleteProductWithMedia } from "./storage-db";

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------
export async function dbDeleteProduct(id: number): Promise<void> {
  await dbDeleteProductWithMedia(id);
}

// ---------------------------------------------------------------------------
// ADD MEDIA (Single)
// ---------------------------------------------------------------------------
export async function dbAddProductMedia(data: {
  product_id: number;
  r2_key: string;
  r2_url: string;
  file_type: "IMAGE" | "VIDEO";
  file_size_bytes: number;
  is_primary?: boolean;
}): Promise<number> {
  const meta = await d1Execute(
    `INSERT INTO product_media (product_id, r2_key, r2_url, file_type, file_size_bytes, is_primary)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.product_id,
      data.r2_key,
      data.r2_url,
      data.file_type,
      data.file_size_bytes,
      data.is_primary ? 1 : 0,
    ]
  );

  await d1Execute(
    `UPDATE products SET total_media_bytes = total_media_bytes + ? WHERE id = ?`,
    [data.file_size_bytes, data.product_id]
  );

  return meta.last_row_id;
}
