// app/api/admin/gallery/route.ts
// Admin endpoints for the dashboard "Images" page:
//   GET  → current hero image + all categories with their image_url & is_active
//   POST → set/clear the hero image or a category image, or toggle a category's
//          visibility on the storefront.
//          body: { type: "hero" } | { type: "category", categoryId }
//                | { type: "category-active", categoryId, active }
//                + imageUrl (full URL) OR omit/empty to restore the default.
//
// Whenever a custom image is replaced or reset to the default, the old object
// is deleted from R2 so the bucket doesn't accumulate orphans.
import { NextRequest, NextResponse } from "next/server";
import { dbGetAllCategories, dbSetCategoryImage, dbSetCategoryActive } from "@/lib/categories-db";
import { getSiteSettings, setHeroImage } from "@/lib/settings";
import { r2KeyFromUrl, r2Delete } from "@/lib/r2";
import { isAdminRequest, rejectUnsafeAdminRequest } from "@/lib/admin-api";

export const runtime = "nodejs";

// Only full URLs may be stored (upload flow returns complete Cloudflare R2 URLs).
// Empty/null means "restore the bundled default image".
function normalizeImageUrl(raw: unknown): string | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  const url = raw.trim();
  if (!/^https?:\/\//.test(url) || url.length > 2000) return null;
  return url;
}

// Best-effort delete of the previously-stored object in R2. Never throws — if
// the cleanup fails we must not fail the main operation.
async function deleteR2ObjectIfOurs(url: string | null | undefined): Promise<void> {
  const key = r2KeyFromUrl(url);
  if (!key) return; // bundled /images/... default or external URL — not ours
  try {
    await r2Delete(key);
  } catch (err) {
    console.error("[gallery] R2 cleanup failed for key:", key, err);
  }
}

export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [categories, settings] = await Promise.all([dbGetAllCategories(), getSiteSettings()]);
  return NextResponse.json({ categories, heroImage: settings.hero_image ?? null });
}

export async function POST(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  const body = await req.json().catch(() => null);
  const type = body?.type;
  const imageUrl = normalizeImageUrl(body?.imageUrl);

  try {
    if (type === "hero") {
      const settings = await getSiteSettings();
      const oldImage = settings.hero_image;
      await setHeroImage(imageUrl);
      if (oldImage && oldImage !== imageUrl) {
        await deleteR2ObjectIfOurs(oldImage);
      }
      return NextResponse.json({ ok: true });
    }

    if (type === "category-active") {
      const categoryId = Number(body?.categoryId);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      await dbSetCategoryActive(categoryId, Boolean(body?.active));
      return NextResponse.json({ ok: true });
    }

    if (type === "category") {
      const categoryId = Number(body?.categoryId);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return NextResponse.json({ error: "Invalid category" }, { status: 400 });
      }
      const all = await dbGetAllCategories();
      const category = all.find((c) => c.id === categoryId);
      const oldImage = category?.image_url ?? null;
      await dbSetCategoryImage(categoryId, imageUrl);
      if (oldImage && oldImage !== imageUrl) {
        await deleteR2ObjectIfOurs(oldImage);
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown type" }, { status: 400 });
  } catch (err) {
    console.error("[gallery POST]", err);
    return NextResponse.json({ error: "Failed to update gallery" }, { status: 500 });
  }
}
