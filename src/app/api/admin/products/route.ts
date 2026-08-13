// app/api/admin/products/route.ts — Products API connected to Cloudflare D1 + R2
import { NextRequest } from "next/server";
import {
  dbGetAllProducts, dbCreateProduct, dbUpdateProduct,
  dbDeleteProduct, dbReplaceProductMedia, DBProductMediaItem,
} from "@/lib/products-db";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import {
  requireAdminSession, rateLimit, getClientIp,
  sanitizeString, sanitizeNumber,
  okResponse, errorResponse,
} from "@/lib/security";

export const runtime = "nodejs";

const R2_PUBLIC_BASE = (process.env.R2_PUBLIC_URL || "https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev").replace(/\/$/, "");

type ProductColor = { id: string; name: string; value: string };

function normalizeMediaUrl(url: string): string {
  const clean = String(url || "").trim();
  if (!clean) return "";
  if (clean.startsWith("http://") || clean.startsWith("https://")) return clean;
  if (clean.startsWith("/api/media/")) return `${R2_PUBLIC_BASE}/${clean.slice("/api/media/".length)}`;
  if (clean.startsWith("/api/stream/")) return `${R2_PUBLIC_BASE}/${clean.slice("/api/stream/".length)}`;
  return `${R2_PUBLIC_BASE}/${clean.replace(/^\/+/, "")}`;
}

function normalizeColorMediaMap(
  rawMap: unknown,
  colors: ProductColor[],
  mediaItems: DBProductMediaItem[]
): Record<string, string[]> {
  if (!rawMap || typeof rawMap !== "object") return {};

  const mediaByKey = new Map<string, string>();
  for (const item of mediaItems) {
    const normalized = normalizeMediaUrl(item.r2_url);
    if (normalized) mediaByKey.set(normalized.toLowerCase(), normalized);
  }

  const colorIdByKey = new Map<string, string>();
  for (const color of colors) {
    colorIdByKey.set(String(color.id).toLowerCase(), color.id);
    colorIdByKey.set(String(color.name).toLowerCase(), color.id);
    colorIdByKey.set(String(color.value).toLowerCase(), color.id);
  }

  const next: Record<string, string[]> = {};
  const usedMedia = new Set<string>();

  for (const [rawColorId, rawList] of Object.entries(rawMap as Record<string, unknown>)) {
    const colorId = colorIdByKey.get(String(rawColorId).toLowerCase()) || (colors.length === 0 ? String(rawColorId) : "");
    if (!colorId || next[colorId] || !Array.isArray(rawList)) continue;

    for (const rawUrl of rawList) {
      const normalized = normalizeMediaUrl(String(rawUrl || ""));
      const canonical = mediaByKey.get(normalized.toLowerCase());
      if (canonical && !usedMedia.has(canonical.toLowerCase())) {
        next[colorId] = [canonical];
        usedMedia.add(canonical.toLowerCase());
        break;
      }
    }
  }

  return next;
}

function extractMediaItems(body: Record<string, unknown>): DBProductMediaItem[] {
  const items: DBProductMediaItem[] = [];

  // 1. Primary Image
  if (body.primary_image) {
    const p = body.primary_image;
    if (typeof p === "string" && p.trim()) {
      items.push({ r2_url: normalizeMediaUrl(p), file_type: "IMAGE", is_primary: true });
    } else if (typeof p === "object" && p !== null) {
      const obj = p as Record<string, unknown>;
      const url = String(obj.r2_url || obj.url || "").trim();
      if (url) {
        items.push({
          r2_url: normalizeMediaUrl(url),
          r2_key: String(obj.r2_key || obj.key || url),
          file_type: "IMAGE",
          file_size_bytes: Number(obj.file_size_bytes || obj.size || 0),
          is_primary: true,
        });
      }
    }
  }

  // 2. Gallery Images
  const rawImages = Array.isArray(body.images) ? body.images : [];
  for (const img of rawImages) {
    const obj = typeof img === "object" && img !== null ? (img as Record<string, unknown>) : null;
    const url = typeof img === "string" ? img.trim() : String(obj?.r2_url || obj?.url || "").trim();
    const normalizedUrl = normalizeMediaUrl(url);
    if (normalizedUrl && !items.some(it => normalizeMediaUrl(it.r2_url).toLowerCase() === normalizedUrl.toLowerCase())) {
      items.push({
        r2_url: normalizedUrl,
        r2_key: obj ? String(obj.r2_key || obj.key || url) : url,
        file_type: "IMAGE",
        file_size_bytes: obj ? Number(obj.file_size_bytes || obj.size || 0) : 0,
        is_primary: false,
      });
    }
  }

  // 3. Videos
  const rawVideos = Array.isArray(body.videos) ? body.videos : [];
  for (const vid of rawVideos) {
    const obj = typeof vid === "object" && vid !== null ? (vid as Record<string, unknown>) : null;
    const url = typeof vid === "string" ? vid.trim() : String(obj?.r2_url || obj?.url || "").trim();
    const normalizedUrl = normalizeMediaUrl(url);
    if (normalizedUrl && !items.some(it => normalizeMediaUrl(it.r2_url).toLowerCase() === normalizedUrl.toLowerCase())) {
      items.push({
        r2_url: normalizedUrl,
        r2_key: obj ? String(obj.r2_key || obj.key || url) : url,
        file_type: "VIDEO",
        file_size_bytes: obj ? Number(obj.file_size_bytes || obj.size || 0) : 0,
        is_primary: false,
      });
    }
  }

  // Default to marking first image as primary if none explicitly marked
  if (!items.some(it => it.is_primary)) {
    const firstImg = items.find(it => it.file_type === "IMAGE");
    if (firstImg) firstImg.is_primary = true;
  }

  return items;
}

// ── GET all products ──────────────────────────────────────────────────────────
export async function GET() {
  if (!await requireAdminSession()) return errorResponse("Unauthorized", 401);

  try {
    const products = await dbGetAllProducts(false); // get all including inactive
    return okResponse({ ok: true, products });
  } catch (err) {
    console.error("[admin/products GET]", err);
    return errorResponse("خطأ في جلب المنتجات", 500);
  }
}

// ── POST create product ───────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const ip = getClientIp(req);
  if (!rateLimit(`admin-products-post:${ip}`, { windowMs: 60_000, max: 30 })) {
    return errorResponse("Too many requests", 429);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return errorResponse("Invalid JSON", 400); }

  const title       = sanitizeString(body.title || body.name, 150);
  const description = sanitizeString(body.description, 1000);
  const price       = sanitizeNumber(body.price, 1, 10_000_000);
  const title_fr    = sanitizeString(body.title_fr, 150);
  const title_en    = sanitizeString(body.title_en, 150);
  const description_fr = sanitizeString(body.description_fr, 1000);
  const description_en = sanitizeString(body.description_en, 1000);
  const categoryId  = Number(body.category_id || body.categoryId || 1);
  const isFeatured  = Boolean(body.is_featured || body.featured);
  const rawSizes    = Array.isArray(body.sizes) ? body.sizes : [];
  const sizes       = rawSizes
    .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
    .map(s => s.trim().slice(0, 50));
  const rawColors   = Array.isArray(body.colors) ? body.colors : [];
  const colors      = rawColors
    .filter((c: unknown): c is Record<string, unknown> =>
      typeof c === "object" && c !== null && Boolean((c as Record<string, unknown>).name || (c as Record<string, unknown>).value))
    .map(c => ({
      id: String(c.id || `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
      name: String(c.name || c.value || "").trim().slice(0, 50),
      value: String(c.value || "#D4AF37").trim().slice(0, 30),
    }));

  const mediaItems = extractMediaItems(body);
  const color_media_map = normalizeColorMediaMap(body.color_media_map, colors, mediaItems);

  if (!title) return errorResponse("اسم المنتج مطلوب", 400);
  if (price === null) return errorResponse("السعر غير صحيح", 400);

  try {
    const productId = await dbCreateProduct({
      category_id: categoryId,
      title,
      title_fr,
      title_en,
      description,
      description_fr,
      description_en,
      price,
      sizes,
      colors,
      color_media_map,
      is_featured: isFeatured,
    });

    // Save media to product_media table
    if (mediaItems.length > 0) {
      await dbReplaceProductMedia(productId, mediaItems);
    }

    return okResponse({ ok: true, productId });
  } catch (err) {
    console.error("[admin/products POST]", err);
    return errorResponse("خطأ في إنشاء المنتج", 500);
  }
}

// ── PUT update product ────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const ip = getClientIp(req);
  if (!rateLimit(`admin-products-put:${ip}`, { windowMs: 60_000, max: 30 })) {
    return errorResponse("Too many requests", 429);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return errorResponse("Invalid JSON", 400); }

  const id = Number(body.id);
  if (!Number.isInteger(id) || id <= 0) return errorResponse("ID غير صحيح", 400);

  const updateData: Record<string, unknown> = {};

  if (body.title !== undefined || body.name !== undefined) {
    updateData.title = sanitizeString(body.title || body.name, 150);
  }
  if (body.title_fr !== undefined) {
    updateData.title_fr = sanitizeString(body.title_fr, 150);
  }
  if (body.title_en !== undefined) {
    updateData.title_en = sanitizeString(body.title_en, 150);
  }
  if (body.description !== undefined) {
    updateData.description = sanitizeString(body.description, 1000);
  }
  if (body.description_fr !== undefined) {
    updateData.description_fr = sanitizeString(body.description_fr, 1000);
  }
  if (body.description_en !== undefined) {
    updateData.description_en = sanitizeString(body.description_en, 1000);
  }
  if (body.price !== undefined) {
    const p = sanitizeNumber(body.price, 1, 10_000_000);
    if (p === null) return errorResponse("السعر غير صحيح", 400);
    updateData.price = p;
  }
  if (body.category_id !== undefined || body.categoryId !== undefined) {
    updateData.category_id = Number(body.category_id || body.categoryId);
  }
  if (body.is_active !== undefined) updateData.is_active = Boolean(body.is_active);
  if (body.is_featured !== undefined || body.featured !== undefined) updateData.is_featured = Boolean(body.is_featured ?? body.featured);
  if (Array.isArray(body.sizes)) {
    updateData.sizes = body.sizes
      .filter((s: unknown): s is string => typeof s === "string" && s.trim().length > 0)
      .map(s => s.trim().slice(0, 50));
  }
  if (Array.isArray(body.colors)) {
    updateData.colors = body.colors
      .filter((c: unknown): c is Record<string, unknown> =>
        typeof c === "object" && c !== null && Boolean((c as Record<string, unknown>).name || (c as Record<string, unknown>).value))
      .map(c => ({
        id: String(c.id || `c-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`),
        name: String(c.name || c.value || "").trim().slice(0, 50),
        value: String(c.value || "#D4AF37").trim().slice(0, 30),
      }));
  }
  if (body.color_media_map !== undefined) {
    const mediaItems = extractMediaItems(body);
    const colorsForMap = (updateData.colors as ProductColor[] | undefined) || [];
    updateData.color_media_map = normalizeColorMediaMap(body.color_media_map, colorsForMap, mediaItems);
  }

  try {
    await dbUpdateProduct(id, updateData);

    // Update media items if provided in payload
    if (body.primary_image !== undefined || body.images !== undefined || body.videos !== undefined || body.media !== undefined) {
      const mediaItems = extractMediaItems(body);
      await dbReplaceProductMedia(id, mediaItems);
    }

    return okResponse({ ok: true });
  } catch (err) {
    console.error("[admin/products PUT]", err);
    return errorResponse("خطأ في تحديث المنتج", 500);
  }
}

// ── DELETE product ────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const ip = getClientIp(req);
  if (!rateLimit(`admin-products-delete:${ip}`, { windowMs: 60_000, max: 10 })) {
    return errorResponse("Too many requests", 429);
  }

  const id = Number(req.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return errorResponse("ID غير صحيح", 400);

  try {
    await dbDeleteProduct(id);
    return okResponse({ ok: true });
  } catch (err) {
    console.error("[admin/products DELETE]", err);
    return errorResponse("خطأ في حذف المنتج", 500);
  }
}
