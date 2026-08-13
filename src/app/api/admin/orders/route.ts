// app/api/admin/orders/route.ts — Admin orders management (D1)
import { NextRequest } from "next/server";
import {
  dbGetAllOrders, dbUpdateOrderStatus, dbDeleteOrders, OrderStatus,
} from "@/lib/orders-db";
import { UpdateOrderStatusSchema } from "@/lib/validation";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import {
  requireAdminSession, rateLimit, getClientIp, okResponse, errorResponse,
} from "@/lib/security";

export const runtime = "nodejs";

// ── GET all orders ────────────────────────────────────────────────────────────
export async function GET() {
  if (!await requireAdminSession()) return errorResponse("Unauthorized", 401);

  try {
    const orders = await dbGetAllOrders();
    return okResponse({ ok: true, orders });
  } catch (err) {
    console.error("[admin/orders GET]", err);
    return errorResponse("خطأ في جلب الطلبات", 500);
  }
}

// ── PATCH — update order status ───────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const ip = getClientIp(req);
  if (!rateLimit(`admin-orders:${ip}`, { windowMs: 60_000, max: 60 })) {
    return errorResponse("Too many requests", 429);
  }

  let body: Record<string, unknown>;
  try { body = await req.json(); }
  catch { return errorResponse("Invalid JSON", 400); }

  const parsed = UpdateOrderStatusSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => i.message).join("; ");
    return errorResponse(`Données invalides: ${msg}`, 400);
  }

  const { id, status } = parsed.data;

  try {
    await dbUpdateOrderStatus(id, status as OrderStatus);
    return okResponse({ ok: true });
  } catch (err) {
    console.error("[admin/orders PATCH]", err);
    return errorResponse("خطأ في تحديث الطلب", 500);
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const id = Number(req.nextUrl.searchParams.get("id"));
  const idsParam = req.nextUrl.searchParams.get("ids");
  let ids: number[] = [];

  if (idsParam) {
    ids = idsParam.split(",").map(v => Number(v.trim())).filter(n => Number.isInteger(n) && n > 0);
    ids = Array.from(new Set(ids));
    if (ids.length === 0) return errorResponse("IDs غير صحيحة", 400);
  } else if (Number.isInteger(id) && id > 0) {
    ids = [id];
  } else {
    return errorResponse("ID غير صحيح", 400);
  }

  try {
    await dbDeleteOrders(ids);
    return okResponse({ ok: true, deleted: ids.length });
  } catch (err) {
    console.error("[admin/orders DELETE]", err);
    return errorResponse("خطأ في حذف الطلب", 500);
  }
}
