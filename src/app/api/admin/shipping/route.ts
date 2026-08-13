// app/api/admin/shipping/route.ts — Shipping rates management (D1)
import { NextRequest } from "next/server";
import { dbGetAllRates, dbBulkUpdateRates, dbCreateWilaya, dbDeleteWilaya, dbUpdateRate } from "@/lib/shipping-db";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import {
  requireAdminSession, rateLimit, getClientIp, okResponse, errorResponse,
} from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  if (!await requireAdminSession()) return errorResponse("Unauthorized", 401);

  try {
    const rates = await dbGetAllRates();
    return okResponse({ ok: true, rates });
  } catch (err) {
    console.error("[admin/shipping GET]", err);
    return errorResponse("خطأ في جلب أسعار التوصيل", 500);
  }
}

export async function POST(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const ip = getClientIp(req);
  if (!rateLimit(`admin-shipping:${ip}`, { windowMs: 60_000, max: 10 })) {
    return errorResponse("Too many requests", 429);
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return errorResponse("Invalid JSON", 400); }

  if (!Array.isArray(body)) return errorResponse("Invalid payload", 400);

  // Validate each rate update
  const updates: Array<{ code: number; price_home: number; price_desk: number }> = [];
  for (const item of body) {
    const code       = Number(item?.code);
    const price_home = Number(item?.domicile ?? item?.price_home);
    const price_desk = Number(item?.bureau   ?? item?.price_desk);

    if (!Number.isInteger(code) || code < 1 || code > 58) continue;
    if (!Number.isFinite(price_home) || price_home < 0 || price_home > 5000) continue;
    if (!Number.isFinite(price_desk) || price_desk < 0 || price_desk > 5000) continue;

    updates.push({ code, price_home: Math.floor(price_home), price_desk: Math.floor(price_desk) });
  }

  if (updates.length === 0) return errorResponse("لا توجد بيانات صحيحة", 400);

  try {
    await dbBulkUpdateRates(updates);
    return okResponse({ ok: true, updated: updates.length });
  } catch (err) {
    console.error("[admin/shipping POST]", err);
    return errorResponse("خطأ في حفظ الأسعار", 500);
  }
}

export async function PUT(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const ip = getClientIp(req);
  if (!rateLimit(`admin-shipping-add:${ip}`, { windowMs: 60_000, max: 5 })) {
    return errorResponse("Too many requests", 429);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return errorResponse("Invalid JSON", 400); }

  const code = Number(body?.wilaya_code);
  const nameAr = String(body?.wilaya_name || "").trim();
  const nameFr = String(body?.name_fr || "").trim();
  const nameEn = String(body?.name_en || "").trim();
  const priceHome = Number(body?.price_home);
  const priceDesk = Number(body?.price_desk);

  if (!Number.isInteger(code) || code < 1 || code > 999) {
    return errorResponse("Invalid wilaya code", 400);
  }
  if (!nameAr || !nameFr || !nameEn) {
    return errorResponse("Names required in all languages", 400);
  }
  if (!Number.isFinite(priceHome) || priceHome < 0 || priceHome > 5000) {
    return errorResponse("Invalid home price", 400);
  }
  if (!Number.isFinite(priceDesk) || priceDesk < 0 || priceDesk > 5000) {
    return errorResponse("Invalid desk price", 400);
  }

  try {
    await dbCreateWilaya({
      wilaya_code: code,
      wilaya_name: nameAr,
      name_fr: nameFr,
      name_en: nameEn,
      price_home: Math.floor(priceHome),
      price_desk: Math.floor(priceDesk),
    });
    return okResponse({ ok: true });
  } catch (err: unknown) {
    console.error("[admin/shipping PUT]", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE")) {
      return errorResponse("Wilaya code already exists", 409);
    }
    return errorResponse("Failed to create wilaya", 500);
  }
}

export async function PATCH(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const ip = getClientIp(req);
  if (!rateLimit(`admin-shipping-update:${ip}`, { windowMs: 60_000, max: 10 })) {
    return errorResponse("Too many requests", 429);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return errorResponse("Invalid JSON", 400); }

  const code = Number(body?.wilaya_code);
  if (!Number.isInteger(code) || code < 1) {
    return errorResponse("Invalid wilaya code", 400);
  }

  const updateData: Record<string, unknown> = {};

  if (body.wilaya_name !== undefined) {
    const nameAr = String(body.wilaya_name).trim();
    if (!nameAr) return errorResponse("Arabic name required", 400);
    updateData.wilaya_name = nameAr;
  }

  if (body.name_fr !== undefined) {
    const nameFr = String(body.name_fr).trim();
    if (!nameFr) return errorResponse("French name required", 400);
    updateData.name_fr = nameFr;
  }

  if (body.name_en !== undefined) {
    const nameEn = String(body.name_en).trim();
    if (!nameEn) return errorResponse("English name required", 400);
    updateData.name_en = nameEn;
  }

  if (body.price_home !== undefined) {
    const priceHome = Number(body.price_home);
    if (!Number.isFinite(priceHome) || priceHome < 0 || priceHome > 5000) {
      return errorResponse("Invalid home price", 400);
    }
    updateData.price_home = Math.floor(priceHome);
  }

  if (body.price_desk !== undefined) {
    const priceDesk = Number(body.price_desk);
    if (!Number.isFinite(priceDesk) || priceDesk < 0 || priceDesk > 5000) {
      return errorResponse("Invalid desk price", 400);
    }
    updateData.price_desk = Math.floor(priceDesk);
  }

  if (Object.keys(updateData).length === 0) {
    return errorResponse("No fields to update", 400);
  }

  try {
    await dbUpdateRate(code, updateData);
    return okResponse({ ok: true });
  } catch (err) {
    console.error("[admin/shipping PATCH]", err);
    return errorResponse("Failed to update wilaya", 500);
  }
}

export async function DELETE(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const ip = getClientIp(req);
  if (!rateLimit(`admin-shipping-delete:${ip}`, { windowMs: 60_000, max: 5 })) {
    return errorResponse("Too many requests", 429);
  }

  const url = new URL(req.url);
  const code = Number(url.searchParams.get("code"));

  if (!Number.isInteger(code) || code < 1) {
    return errorResponse("Invalid wilaya code", 400);
  }

  try {
    await dbDeleteWilaya(code);
    return okResponse({ ok: true });
  } catch (err) {
    console.error("[admin/shipping DELETE]", err);
    return errorResponse("Failed to delete wilaya", 500);
  }
}
