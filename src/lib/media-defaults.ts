// lib/media-defaults.ts — Bundled default images for the hero and each category.
// These ship inside /public so the store always looks complete even before the
// admin uploads custom photos. A NULL image_url in D1 means "use these defaults".
// WebP versions of the original PNGs (≈6× smaller) for fast loading.
export const HERO_DEFAULT_IMAGE = "/images/hero_caftan.webp";

// Keyed by the categories.slug value in D1.
export const CATEGORY_DEFAULT_IMAGES: Record<string, string> = {
  caftans: "/images/category_bridal.webp",
  "robes-kabyles": "/images/category_modern.webp",
  "blouza-oranaise": "/images/category_tasdira.webp",
  karakou: "/images/category_bridal.webp",
  "robes-d-hotesse": "/images/category_modern.webp",
};

export function categoryDefaultImage(slug: string): string {
  return CATEGORY_DEFAULT_IMAGES[slug] || "/images/category_bridal.webp";
}
