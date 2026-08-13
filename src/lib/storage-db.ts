import "server-only";
// lib/storage-db.ts — Storage tracking & R2 media cleanup using Cloudflare D1 & R2
//
// The storage page answers two questions:
//   1. "How much of my R2 bucket is used?"   → answered by actually listing R2
//   2. "What is using it, and what can I free?" → D1 breakdown + orphan detection
import { d1Query, d1QueryFirst, d1Execute } from "./db";
import { r2Delete, r2DeleteMany, r2ListObjects, r2KeyFromUrl } from "./r2";

export const R2_LIMIT_BYTES = 10 * 1024 * 1024 * 1024; // 10 GB Cloudflare R2 free tier limit
export const D1_LIMIT_BYTES = 5 * 1024 * 1024 * 1024;  // 5 GB Cloudflare D1 free tier limit
const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

export interface ProductStorageItem {
  id: number;
  title: string;
  category_name_ar: string;
  mediaCount: number;
  imagesCount: number;
  videosCount: number;
  usedBytes: number;
  media: Array<{
    id: number;
    r2_key: string;
    r2_url: string;
    file_type: "IMAGE" | "VIDEO";
    file_size_bytes: number;
    is_primary?: boolean;
  }>;
}

export interface R2ObjectInfo {
  key: string;
  size: number;
}

export interface StorageOverview {
  r2: {
    limitGb: number;
    usedBytes: number;   // REAL bytes actually in R2 (0 if listing failed)
    usedGb: number;
    freeGb: number;
    percent: number;
    status: "ok" | "warning" | "danger";
    measured: boolean;        // true = real R2 listing succeeded
    objectCount: number;      // number of objects actually in R2
    trackedBytes: number;     // bytes D1 accounts for (product media + hero + categories)
    orphanCount: number;      // objects in R2 not referenced anywhere in D1
    orphansBytes: number;
    orphans: R2ObjectInfo[];  // capped list for display
  };
  d1: {
    limitGb: number;
    totalRows: number;
    ordersCount: number;
    productsCount: number;
    mediaCount: number;
    usedMb: number;
    usedGb: number;
    freeGb: number;
    percent: number;
  };
  products: ProductStorageItem[];
}

export async function dbGetStorageOverview(): Promise<StorageOverview> {
  const products = await d1Query<{ id: number; title: string; category_name: string }>(`
    SELECT p.id, p.title, c.name_ar AS category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    ORDER BY p.created_at DESC
  `);

  const mediaRows = await d1Query<{
    id: number;
    product_id: number;
    r2_key: string;
    r2_url: string;
    file_type: "IMAGE" | "VIDEO";
    file_size_bytes: number;
    is_primary: number;
  }>(`
    SELECT id, product_id, r2_key, r2_url, file_type, file_size_bytes, is_primary
    FROM product_media
    ORDER BY id DESC
  `);

  // Count rows in D1 for DB stats
  const ordersCount = await d1QueryFirst<{ cnt: number }>(`SELECT COUNT(*) as cnt FROM orders`).then(r => r?.cnt ?? 0);
  const productsCount = products.length;
  const mediaCount = mediaRows.length;
  const totalD1Rows = ordersCount + productsCount + mediaCount;

  // Estimate D1 DB size in MB (~1.5 KB per row)
  const d1EstimatedBytes = Math.max(128 * 1024, totalD1Rows * 1500);
  const d1UsedMb = d1EstimatedBytes / MB;
  const d1UsedGb = d1EstimatedBytes / GB;
  const d1FreeGb = Math.max(0, 5 - d1UsedGb);
  const d1Percent = Math.min(100, (d1EstimatedBytes / D1_LIMIT_BYTES) * 100);

  let grandTotalR2Bytes = 0;

  const items: ProductStorageItem[] = products.map(p => {
    const pMedia = mediaRows.filter(m => m.product_id === p.id);
    let pBytes = 0;

    const mediaList = pMedia.map(m => {
      // Estimate bytes if not set (300KB image, 5MB video)
      const estimated = m.file_size_bytes > 0
        ? m.file_size_bytes
        : (m.file_type === "VIDEO" ? 5 * 1024 * 1024 : 300 * 1024);
      pBytes += estimated;
      return {
        id: m.id,
        r2_key: m.r2_key,
        r2_url: m.r2_url,
        file_type: m.file_type,
        file_size_bytes: estimated,
        is_primary: Boolean(m.is_primary),
      };
    });

    grandTotalR2Bytes += pBytes;

    return {
      id: p.id,
      title: p.title,
      category_name_ar: p.category_name,
      mediaCount: pMedia.length,
      imagesCount: pMedia.filter(m => m.file_type === "IMAGE").length,
      videosCount: pMedia.filter(m => m.file_type === "VIDEO").length,
      usedBytes: pBytes,
      media: mediaList,
    };
  });

  // ── REAL R2 measurement ────────────────────────────────────────────────────
  // List the actual bucket contents so the "used / free" numbers reflect what R2
  // really holds — not just what D1 records. This catches orphaned uploads, the
  // hero image, category images and any file whose size D1 couldn't record.
  let r2Objects: R2ObjectInfo[] = [];
  let r2Measured = false;
  try {
    r2Objects = await r2ListObjects();
    r2Measured = true;
  } catch (err) {
    console.error("[storage-db] R2 listing failed, falling back to D1 estimate", err);
  }

  // Keys that D1 references: product media + hero + category images.
  const referencedKeys = new Set<string>();
  for (const m of mediaRows) {
    const k = extractKey(m.r2_key, m.r2_url);
    if (k) referencedKeys.add(k);
  }
  try {
    const hero = await d1QueryFirst<{ hero_image: string | null }>(`SELECT hero_image FROM site_settings WHERE id = 'store'`);
    const heroKey = r2KeyFromUrl(hero?.hero_image);
    if (heroKey) referencedKeys.add(heroKey);
  } catch {}
  try {
    const cats = await d1Query<{ image_url: string | null }>(`SELECT image_url FROM categories WHERE image_url IS NOT NULL`);
    for (const c of cats) {
      const k = r2KeyFromUrl(c.image_url);
      if (k) referencedKeys.add(k);
    }
  } catch {}

  const orphans = r2Objects.filter(o => !referencedKeys.has(o.key));
  const orphansBytes = orphans.reduce((sum, o) => sum + o.size, 0);

  const actualR2Bytes = r2Objects.reduce((sum, o) => sum + o.size, 0);
  const usedBytes = r2Measured ? actualR2Bytes : grandTotalR2Bytes;
  const r2UsedGb = usedBytes / GB;
  const r2FreeGb = Math.max(0, 10 - r2UsedGb);
  const r2Percent = Math.min(100, (usedBytes / R2_LIMIT_BYTES) * 100);
  const r2Status: "ok" | "warning" | "danger" = r2UsedGb > 8.5 ? "danger" : r2UsedGb >= 7 ? "warning" : "ok";

  return {
    r2: {
      limitGb: 10,
      usedBytes,
      usedGb: r2UsedGb,
      freeGb: r2FreeGb,
      percent: r2Percent,
      status: r2Status,
      measured: r2Measured,
      objectCount: r2Objects.length,
      trackedBytes: grandTotalR2Bytes,
      orphanCount: orphans.length,
      orphansBytes,
      orphans: orphans.slice(0, 200), // keep the payload light; count is the real total
    },
    d1: {
      limitGb: 5,
      totalRows: totalD1Rows,
      ordersCount,
      productsCount,
      mediaCount,
      usedMb: d1UsedMb,
      usedGb: d1UsedGb,
      freeGb: d1FreeGb,
      percent: d1Percent,
    },
    products: items,
  };
}

// Delete every R2 object that is not referenced anywhere in D1 (product media,
// hero image, category images). Returns how many objects were removed and the
// bytes freed. After deletion the real R2 total shrinks by exactly `bytes`.
export async function dbDeleteOrphans(): Promise<{ deleted: number; bytes: number }> {
  const overview = await dbGetStorageOverview();
  const orphanKeys = overview.r2.orphans.map(o => o.key);
  const bytes = overview.r2.orphans.reduce((s, o) => s + o.size, 0);
  const deleted = await r2DeleteMany(orphanKeys);
  return { deleted, bytes };
}

export async function dbCleanProductMedia(productId: number): Promise<void> {
  const mediaRows = await d1Query<{ r2_key: string; r2_url: string }>(
    `SELECT r2_key, r2_url FROM product_media WHERE product_id = ?`,
    [productId]
  );

  for (const row of mediaRows) {
    const key = extractKey(row.r2_key, row.r2_url);
    if (key) {
      await r2Delete(key).catch(err => console.error("[R2 Delete error]", err));
    }
  }

  await d1Execute(`DELETE FROM product_media WHERE product_id = ?`, [productId]);
  await d1Execute(`UPDATE products SET total_media_bytes = 0 WHERE id = ?`, [productId]);
}

// Delete a product along with its media (R2 objects + D1 rows) and any order
// references. Orders are preserved: the product's line items are removed from
// multi-item orders, and legacy single-product orders (which have no line items)
// are removed entirely.
export async function dbDeleteProductWithMedia(productId: number): Promise<void> {
  await dbCleanProductMedia(productId);

  // Remove the product's line items from every multi-item order (order_items).
  await d1Execute(`DELETE FROM order_items WHERE product_id = ?`, [productId]);

  // Remove legacy single-product orders — those that referenced this product in
  // the header and have NO order_items rows.
  await d1Execute(
    `DELETE FROM orders
     WHERE product_id = ?
       AND NOT EXISTS (SELECT 1 FROM order_items WHERE order_items.order_id = orders.id)`,
    [productId]
  );

  // Multi-item orders that still have other items keep their header, but its
  // product_id (which pointed at the deleted product and is NOT NULL + FK-bound)
  // must be reassigned to one of the remaining items so the delete succeeds.
  await d1Execute(
    `UPDATE orders
     SET product_id = (SELECT oi.product_id FROM order_items oi WHERE oi.order_id = orders.id ORDER BY oi.id ASC LIMIT 1)
     WHERE product_id = ?
       AND EXISTS (SELECT 1 FROM order_items WHERE order_items.order_id = orders.id)`,
    [productId]
  );

  await d1Execute(`DELETE FROM products WHERE id = ?`, [productId]);
}

export async function dbDeleteSingleMedia(mediaId: number): Promise<void> {
  const row = await d1QueryFirst<{ r2_key: string; r2_url: string; product_id: number }>(
    `SELECT r2_key, r2_url, product_id FROM product_media WHERE id = ?`,
    [mediaId]
  );

  if (row) {
    const key = extractKey(row.r2_key, row.r2_url);
    if (key) {
      await r2Delete(key).catch(err => console.error("[R2 Delete error]", err));
    }
    await d1Execute(`DELETE FROM product_media WHERE id = ?`, [mediaId]);
  }
}

export function extractKey(r2_key?: string, r2_url?: string): string | null {
  const str = (r2_key || r2_url || "").trim();
  if (!str) return null;

  // 1. If string contains "uploads/", extract "uploads/filename.ext"
  const idx = str.indexOf("uploads/");
  if (idx !== -1) {
    return str.substring(idx).split("?")[0].trim() || null;
  }

  // 2. If it's a full R2 public URL, derive the key
  const urlKey = r2KeyFromUrl(str);
  if (urlKey) return urlKey;

  // 3. Bare key
  if (/^[a-zA-Z0-9_.\-/]+\.(jpg|jpeg|png|webp|avif|gif|mp4|webm|mov|mkv|avi|3gp|3g2|ogv|flv|mpeg|ts|wmv|m4v)$/i.test(str)) {
    return str;
  }

  return null;
}

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
