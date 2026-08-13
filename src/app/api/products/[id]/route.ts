// app/api/products/[id]/route.ts — Fetch single active product from D1
import { NextRequest } from "next/server";
import { dbGetProductById } from "@/lib/products-db";
import { rateLimit, getClientIp, okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(req);
  if (!rateLimit(`public-product-detail:${ip}`, { windowMs: 60_000, max: 240 })) {
    return errorResponse("Too many requests", 429);
  }

  const resolvedParams = await params;
  const id = Number(resolvedParams.id);

  if (!Number.isInteger(id) || id <= 0) {
    return errorResponse("معرف المنتج غير صحيح", 400);
  }

  try {
    const product = await dbGetProductById(id);

    if (!product || !product.is_active) {
      return errorResponse("المنتج غير موجود", 404);
    }

    const allImages = Array.from(new Set([
      ...(product.primary_image ? [product.primary_image] : []),
      ...(product.images || [])
    ]));

    const mapped = {
      id: product.id.toString(),
      name: product.title,
      name_fr: product.title_fr || "",
      name_en: product.title_en || "",
      description: product.description,
      description_fr: product.description_fr || "",
      description_en: product.description_en || "",
      category: product.category_slug,
      price: product.price,
      primary_image: product.primary_image || allImages[0] || "/images/hero_caftan.webp",
      images: allImages.length > 0 ? allImages : ["/images/hero_caftan.webp"],
      videos: product.videos || [],
      sizes: product.sizes,
      colors: product.colors,
      color_media_map: product.color_media_map || {},
      stock: product.is_active ? "available" : "out_of_stock",
      featured: product.is_featured,
    };

    return okResponse(mapped as Record<string, unknown>);
  } catch (err) {
    console.error("[public/products/[id] GET]", err);
    return errorResponse("خطأ في الخادم", 500);
  }
}