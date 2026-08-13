// lib/categories-db.ts — Category CRUD using D1 (including per-category images)
//
// ARCHITECTURE RULE:
//   image_url stored in D1 is ALWAYS a full URL (Cloudflare R2 public URL or a
//   bundled /images/... path). NULL means "use the bundled default image".
import { d1Query, d1Execute } from "./db";

export interface DBCategory {
  id: number;
  name: string;
  name_ar: string;
  slug: string;
  image_url: string | null;
  // D1 has no boolean type — is_active comes back as 0/1, not true/false.
  is_active: number;
}

export async function dbGetAllCategories(): Promise<DBCategory[]> {
  return d1Query<DBCategory>(
    `SELECT id, name, name_ar, slug, image_url, is_active FROM categories ORDER BY id ASC`
  );
}

// Set (or clear) a category's custom image. Passing null restores the default.
export async function dbSetCategoryImage(categoryId: number, imageUrl: string | null): Promise<void> {
  await d1Execute(`UPDATE categories SET image_url = ? WHERE id = ?`, [imageUrl, categoryId]);
}

// Enable or disable a category on the storefront.
export async function dbSetCategoryActive(categoryId: number, active: boolean): Promise<void> {
  await d1Execute(`UPDATE categories SET is_active = ? WHERE id = ?`, [active ? 1 : 0, categoryId]);
}

// Return only the categories that are visible on the storefront.
export async function dbGetActiveCategories(): Promise<DBCategory[]> {
  return d1Query<DBCategory>(
    `SELECT id, name, name_ar, slug, image_url, is_active FROM categories WHERE is_active = 1 ORDER BY id ASC`
  );
}
