// app/api/gallery-config/route.ts
// Public, read-only. Returns the resolved hero image + each category's image so
// the home page can render whatever the admin chose, falling back to the bundled
// default images when D1 has nothing custom (NULL image_url).
import { NextResponse } from "next/server";
import { dbGetAllCategories } from "@/lib/categories-db";
import { getSiteSettings } from "@/lib/settings";
import { HERO_DEFAULT_IMAGE, categoryDefaultImage } from "@/lib/media-defaults";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  const [categories, settings] = await Promise.all([dbGetAllCategories(), getSiteSettings()]);

  return NextResponse.json({
    heroImage: settings.hero_image || HERO_DEFAULT_IMAGE,
    categories: categories.map(c => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      name_ar: c.name_ar,
      // D1 has no boolean type — is_active comes back as 0/1, not true/false.
      // Normalize here so client checks (`c.is_active !== false`) behave.
      is_active: c.is_active === 1,
      image: c.image_url || categoryDefaultImage(c.slug),
    })),
  });
}
