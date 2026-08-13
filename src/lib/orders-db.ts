import "server-only";
// lib/orders-db.ts — Orders CRUD using D1 (replaces orders.ts JSON version)

import { d1Query, d1QueryFirst, d1Execute } from "./db";
import { checkMultilingualSupport } from "./shipping-db";

export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
export type ShippingType = "HOME" | "DESK";

// One product line inside an order (multi-item cart orders).
export interface OrderItem {
  id: number;
  product_id: number;
  title: string | null;
  selected_size: string | null;
  selected_color: string | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface DBOrder {
  id: number;
  customer_name: string;
  customer_phone: string;
  wilaya_code: number;
  wilaya_name: string;
  wilaya_name_fr?: string | null;
  wilaya_name_en?: string | null;
  commune: string;
  shipping_type: ShippingType;
  product_id: number;
  product_title: string;
  selected_size: string | null;
  selected_color: string | null;
  product_price: number;
  shipping_cost: number;
  total_price: number;
  status: OrderStatus;
  lang: string | null;
  notes: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  wilaya_code: number;
  commune: string;
  shipping_type: ShippingType;
  items: Array<{
    product_id: number;
    title?: string | null;
    selected_size?: string | null;
    selected_color?: string | null;
    quantity?: number;
    unit_price: number;
  }>;
  shipping_cost: number;
  lang?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Attach the line items to a list of order rows. Orders without any order_items
// rows (legacy single-product orders) get a synthetic single line rebuilt from
// the orders header columns so every consumer sees a uniform shape.
// ---------------------------------------------------------------------------
async function attachItems<T extends { id: number }>(orders: T[]): Promise<(T & { items: OrderItem[] })[]> {
  if (orders.length === 0) return [];

  const ids = orders.map((o) => o.id);
  const placeholders = ids.map(() => "?").join(",");
  const itemRows = await d1Query<OrderItem & { order_id: number }>(
    `SELECT order_id, id, product_id, title, selected_size, selected_color, quantity, unit_price
     FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id ASC`,
    ids
  );

  const byOrder = new Map<number, OrderItem[]>();
  for (const row of itemRows) {
    const list = byOrder.get(row.order_id) || [];
    list.push({ ...row, subtotal: row.quantity * row.unit_price });
    byOrder.set(row.order_id, list);
  }

  return orders.map((o) => {
    let items = byOrder.get(o.id) || [];
    if (items.length === 0) {
      // Legacy order — build a single line from the header columns.
      const raw = o as unknown as {
        product_id: number;
        product_title?: string;
        selected_size?: string | null;
        selected_color?: string | null;
        product_price?: number;
      };
      items = [{
        id: 0,
        product_id: raw.product_id,
        title: raw.product_title ?? null,
        selected_size: raw.selected_size ?? null,
        selected_color: raw.selected_color ?? null,
        quantity: 1,
        unit_price: raw.product_price ?? 0,
        subtotal: raw.product_price ?? 0,
      }];
    }
    return { ...o, items };
  });
}

// ---------------------------------------------------------------------------
// GET ALL (with join on wilaya name + product title)
// ---------------------------------------------------------------------------
export async function dbGetAllOrders(): Promise<DBOrder[]> {
  // FR/EN wilaya names only exist after the multilingual migration — select
  // them when available so slips/listings can be localized.
  const hasMultilingual = await checkMultilingualSupport();
  const nameCols = hasMultilingual ? "sr.wilaya_name, sr.name_fr AS wilaya_name_fr, sr.name_en AS wilaya_name_en" : "sr.wilaya_name";
  const rows = await d1Query<Omit<DBOrder, "items">>(`
    SELECT
      o.*,
      ${nameCols},
      p.title AS product_title
    FROM orders o
    LEFT JOIN shipping_rates sr ON o.wilaya_code = sr.wilaya_code
    LEFT JOIN products p ON o.product_id = p.id
    ORDER BY o.created_at DESC
  `);
  return attachItems(rows);
}

// ---------------------------------------------------------------------------
// GET ONE
// ---------------------------------------------------------------------------
export async function dbGetOrderById(id: number): Promise<DBOrder | null> {
  const hasMultilingual = await checkMultilingualSupport();
  const nameCols = hasMultilingual ? "sr.wilaya_name, sr.name_fr AS wilaya_name_fr, sr.name_en AS wilaya_name_en" : "sr.wilaya_name";
  const row = await d1QueryFirst<Omit<DBOrder, "items">>(`
    SELECT o.*, ${nameCols}, p.title AS product_title
    FROM orders o
    LEFT JOIN shipping_rates sr ON o.wilaya_code = sr.wilaya_code
    LEFT JOIN products p ON o.product_id = p.id
    WHERE o.id = ?
  `, [id]);
  if (!row) return null;
  const [withItems] = await attachItems([row]);
  return withItems;
}

// ---------------------------------------------------------------------------
// CREATE — one order header + its line items (multi-item cart support).
// The orders header keeps the legacy single-product columns for backwards
// compatibility: product_id / size / color = first line, product_price = total
// subtotal of all lines.
// ---------------------------------------------------------------------------
export async function dbCreateOrder(data: CreateOrderInput): Promise<number> {
  const items = data.items;
  const subtotal = items.reduce((sum, it) => sum + (it.unit_price * (it.quantity || 1)), 0);
  const first = items[0];
  const total = subtotal + data.shipping_cost;

  const meta = await d1Execute(
    `INSERT INTO orders
      (customer_name, customer_phone, wilaya_code, commune, shipping_type, product_id,
       selected_size, selected_color, product_price, shipping_cost, total_price, lang, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.customer_name,
      data.customer_phone,
      data.wilaya_code,
      data.commune,
      data.shipping_type,
      first.product_id,
      first.selected_size ?? null,
      first.selected_color ?? null,
      subtotal,
      data.shipping_cost,
      total,
      data.lang ?? "ar",
      data.notes ?? null,
    ]
  );

  const orderId = meta.last_row_id;

  for (const it of items) {
    await d1Execute(
      `INSERT INTO order_items (order_id, product_id, title, selected_size, selected_color, quantity, unit_price)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        it.product_id,
        it.title ?? null,
        it.selected_size ?? null,
        it.selected_color ?? null,
        it.quantity || 1,
        it.unit_price,
      ]
    );
  }

  return orderId;
}

// ---------------------------------------------------------------------------
// UPDATE STATUS
// ---------------------------------------------------------------------------
export async function dbUpdateOrderStatus(id: number, status: OrderStatus): Promise<void> {
  await d1Execute(`UPDATE orders SET status = ? WHERE id = ?`, [status, id]);
}

// ---------------------------------------------------------------------------
// ADD NOTES
// ---------------------------------------------------------------------------
export async function dbUpdateOrderNotes(id: number, notes: string): Promise<void> {
  await d1Execute(`UPDATE orders SET notes = ? WHERE id = ?`, [notes, id]);
}

// ---------------------------------------------------------------------------
// DELETE
// ---------------------------------------------------------------------------
export async function dbDeleteOrder(id: number): Promise<void> {
  await d1Execute(`DELETE FROM order_items WHERE order_id = ?`, [id]);
  await d1Execute(`DELETE FROM orders WHERE id = ?`, [id]);
}

export async function dbDeleteOrders(ids: number[]): Promise<void> {
  if (!ids || ids.length === 0) return;
  const placeholders = ids.map(() => "?").join(",");
  await d1Execute(`DELETE FROM order_items WHERE order_id IN (${placeholders})`, ids);
  await d1Execute(`DELETE FROM orders WHERE id IN (${placeholders})`, ids);
}

// ---------------------------------------------------------------------------
// STATS for dashboard KPIs
// ---------------------------------------------------------------------------
export async function dbGetOrderStats() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const [totals] = await d1Query<{
    total: number;
    total_revenue: number;
    pending: number;
    confirmed: number;
    shipped: number;
  }>(`
    SELECT
      COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status != 'CANCELLED' THEN total_price ELSE 0 END), 0) AS total_revenue,
      COALESCE(SUM(CASE WHEN status = 'PENDING'   THEN 1 ELSE 0 END), 0) AS pending,
      COALESCE(SUM(CASE WHEN status = 'CONFIRMED' THEN 1 ELSE 0 END), 0) AS confirmed,
      COALESCE(SUM(CASE WHEN status = 'SHIPPED'   THEN 1 ELSE 0 END), 0) AS shipped
    FROM orders
  `);

  const [todayRow] = await d1Query<{ today_orders: number }>(
    `SELECT COUNT(*) AS today_orders FROM orders WHERE DATE(created_at) = ?`,
    [today]
  );

  return {
    total: totals?.total ?? 0,
    totalRevenue: totals?.total_revenue ?? 0,
    newOrders: totals?.pending ?? 0,
    confirmedOrders: totals?.confirmed ?? 0,
    inShipping: totals?.shipped ?? 0,
    todayOrders: todayRow?.today_orders ?? 0,
  };
}
