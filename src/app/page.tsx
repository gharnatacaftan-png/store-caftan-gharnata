// Server component: resolves the admin-customised hero + category images on the
// server so the home page renders them immediately (no default→custom flash).
// The heavy UI lives in ./HomeClient (client component).
import HomeClient from "./HomeClient";
import { dbGetAllCategories } from "@/lib/categories-db";
import { getSiteSettings } from "@/lib/settings";
import { HERO_DEFAULT_IMAGE, categoryDefaultImage } from "@/lib/media-defaults";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HomePage() {
  const [categories, settings] = await Promise.all([dbGetAllCategories(), getSiteSettings()]);

  const catImages: Record<string, string> = {};
  const active: string[] = [];
  for (const c of categories) {
    catImages[c.slug] = c.image_url || categoryDefaultImage(c.slug);
    if (c.is_active) active.push(c.slug);
  }

  return (
    <HomeClient
      initialHero={settings.hero_image || HERO_DEFAULT_IMAGE}
      initialCatImages={catImages}
      initialActive={active}
    />
  );
}
