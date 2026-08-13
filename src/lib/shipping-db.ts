import "server-only";
// lib/shipping-db.ts — Shipping rates CRUD using D1 (replaces shipping.ts JSON version)

import { d1Query, d1QueryFirst, d1Execute } from "./db";

export interface DBShippingRate {
  wilaya_code: number;
  wilaya_name: string;      // Arabic name
  name_fr?: string;          // French name (may not exist in DB yet)
  name_en?: string;          // English name (may not exist in DB yet)
  price_home: number;
  price_desk: number;
  is_deliverable: boolean;
}

// Check if multilingual columns exist (cache the result)
let hasMultilingualColumns: boolean | null = null;

export async function checkMultilingualSupport(): Promise<boolean> {
  if (hasMultilingualColumns !== null) return hasMultilingualColumns;

  try {
    // Try to query with name_fr - if it succeeds, columns exist
    await d1Query(`SELECT name_fr, name_en FROM shipping_rates LIMIT 1`);
    hasMultilingualColumns = true;
  } catch {
    // Columns don't exist yet
    hasMultilingualColumns = false;
  }

  return hasMultilingualColumns;
}

// ---------------------------------------------------------------------------
// GET ALL
// ---------------------------------------------------------------------------
export async function dbGetAllRates(): Promise<DBShippingRate[]> {
  const hasMultilingual = await checkMultilingualSupport();

  const sql = hasMultilingual
    ? `SELECT wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk, is_deliverable
       FROM shipping_rates ORDER BY wilaya_code ASC`
    : `SELECT wilaya_code, wilaya_name, price_home, price_desk, is_deliverable
       FROM shipping_rates ORDER BY wilaya_code ASC`;

  const rows = await d1Query<DBShippingRate>(sql);
  return rows.map(r => ({ ...r, is_deliverable: Boolean(r.is_deliverable) }));
}

// ---------------------------------------------------------------------------
// GET ONE
// ---------------------------------------------------------------------------
export async function dbGetRateByCode(code: number): Promise<DBShippingRate | null> {
  const row = await d1QueryFirst<DBShippingRate>(
    `SELECT * FROM shipping_rates WHERE wilaya_code = ?`,
    [code]
  );
  if (!row) return null;
  return { ...row, is_deliverable: Boolean(row.is_deliverable) };
}

// ---------------------------------------------------------------------------
// UPDATE ONE (with multilingual names support)
// ---------------------------------------------------------------------------
export async function dbUpdateRate(
  code: number,
  data: {
    wilaya_name?: string;
    name_fr?: string;
    name_en?: string;
    price_home?: number;
    price_desk?: number;
    is_deliverable?: boolean;
  }
): Promise<void> {
  const hasMultilingual = await checkMultilingualSupport();
  const fields: string[] = [];
  const values: (string | number | boolean | null)[] = [];

  if (data.wilaya_name !== undefined) { fields.push("wilaya_name = ?"); values.push(data.wilaya_name); }

  // Only update multilingual fields if columns exist
  if (hasMultilingual) {
    if (data.name_fr !== undefined) { fields.push("name_fr = ?"); values.push(data.name_fr); }
    if (data.name_en !== undefined) { fields.push("name_en = ?"); values.push(data.name_en); }
  }

  if (data.price_home !== undefined) { fields.push("price_home = ?"); values.push(data.price_home); }
  if (data.price_desk !== undefined) { fields.push("price_desk = ?"); values.push(data.price_desk); }
  if (data.is_deliverable !== undefined) { fields.push("is_deliverable = ?"); values.push(data.is_deliverable ? 1 : 0); }

  if (fields.length === 0) return;
  values.push(code);

  await d1Execute(`UPDATE shipping_rates SET ${fields.join(", ")} WHERE wilaya_code = ?`, values);
}

// ---------------------------------------------------------------------------
// BULK UPDATE (used by admin shipping page to save all at once)
// ---------------------------------------------------------------------------
export async function dbBulkUpdateRates(
  updates: Array<{ code: number; price_home: number; price_desk: number }>
): Promise<void> {
  // D1 REST doesn't support batched transactions directly, so we run them sequentially
  for (const u of updates) {
    await d1Execute(
      `UPDATE shipping_rates SET price_home = ?, price_desk = ? WHERE wilaya_code = ?`,
      [u.price_home, u.price_desk, u.code]
    );
  }
}

// ---------------------------------------------------------------------------
// CREATE NEW WILAYA
// ---------------------------------------------------------------------------
export async function dbCreateWilaya(data: {
  wilaya_code: number;
  wilaya_name: string;
  name_fr: string;
  name_en: string;
  price_home: number;
  price_desk: number;
}): Promise<void> {
  const hasMultilingual = await checkMultilingualSupport();

  if (hasMultilingual) {
    await d1Execute(
      `INSERT INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk, is_deliverable)
       VALUES (?, ?, ?, ?, ?, ?, 1)`,
      [data.wilaya_code, data.wilaya_name, data.name_fr, data.name_en, data.price_home, data.price_desk]
    );
  } else {
    // Fallback: only insert Arabic name if multilingual columns don't exist
    await d1Execute(
      `INSERT INTO shipping_rates (wilaya_code, wilaya_name, price_home, price_desk, is_deliverable)
       VALUES (?, ?, ?, ?, 1)`,
      [data.wilaya_code, data.wilaya_name, data.price_home, data.price_desk]
    );
  }
}

// ---------------------------------------------------------------------------
// DELETE WILAYA
// ---------------------------------------------------------------------------
export async function dbDeleteWilaya(code: number): Promise<void> {
  await d1Execute(`DELETE FROM shipping_rates WHERE wilaya_code = ?`, [code]);
}

// ---------------------------------------------------------------------------
// FORCE REFRESH MULTILINGUAL CACHE (call after migration)
// ---------------------------------------------------------------------------
export function refreshMultilingualCache(): void {
  hasMultilingualColumns = null;
}
