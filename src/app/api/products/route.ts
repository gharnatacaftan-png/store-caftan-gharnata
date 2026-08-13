// app/api/products/route.ts — Public active products listing (D1)
import { NextRequest } from "next/server";
import { dbGetAllProducts } from "@/lib/products-db";
import { rateLimit, getClientIp, okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  // Rate limit: max 60 calls per minute per IP
  const ip = getClientIp(req);
  if (!rateLimit(`public-products:${ip}`, { windowMs: 60_000, max: 60 })) {
    return errorResponse("Too many requests", 429);
  }

  try {
    const products = await dbGetAllProducts(true); // only active products
    // Map D1 product structure to frontend product structure
    const mapped = products.map(p => ({
      id: p.id.toString(),
      name: p.title,
      name_fr: p.title_fr || "",
      name_en: p.title_en || "",
      description: p.description,
      description_fr: p.description_fr || "",
      description_en: p.description_en || "",
      category: p.category_slug,
      price: p.price,
      images: p.images.length > 0 ? p.images : ["/images/hero_caftan.webp"],
      sizes: p.sizes,
      colors: p.colors,
      color_media_map: p.color_media_map || {},
      stock: p.is_active ? "available" : "out_of_stock",
      featured: p.is_featured,
    }));

    return okResponse({ ok: true, products: mapped }, 200, {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
    });
  } catch (err) {
    console.error("[public/products GET]", err);
    return errorResponse("خطأ في جلب المنتجات", 500);
  }
}