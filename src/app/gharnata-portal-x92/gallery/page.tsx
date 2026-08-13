import { getAdminSession } from "../actions";
import { redirect } from "next/navigation";
import { dbGetAllCategories } from "@/lib/categories-db";
import { getSiteSettings } from "@/lib/settings";
import GalleryClient from "./GalleryClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GalleryPage() {
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/gharnata-portal-x92/login");

  const [categories, settings] = await Promise.all([dbGetAllCategories(), getSiteSettings()]);

  return (
    <GalleryClient
      initialCategories={categories.map(c => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        name_ar: c.name_ar,
        image_url: c.image_url,
        // D1 returns 0/1 — normalize to a real boolean for GalleryClient.
        is_active: c.is_active === 1,
      }))}
      initialHeroImage={settings.hero_image ?? null}
    />
  );
}
