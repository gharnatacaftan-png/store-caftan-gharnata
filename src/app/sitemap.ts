// app/sitemap.ts — Dynamic sitemap generated at request time
// Returns all public pages + product pages from D1
import { MetadataRoute } from "next";
import { dbGetAllProducts } from "@/lib/products-db";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // refresh every hour

const SITE_URL = "https://store-caftan-gharnata.pages.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
      alternates: {
        languages: {
          ar: `${SITE_URL}?lang=ar`,
          fr: `${SITE_URL}?lang=fr`,
        },
      },
    },
    {
      url: `${SITE_URL}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
      alternates: {
        languages: {
          ar: `${SITE_URL}/shop?lang=ar`,
          fr: `${SITE_URL}/shop?lang=fr`,
        },
      },
    },
    {
      url: `${SITE_URL}/shop?cat=caftan`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/shop?cat=kabyle`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/shop?cat=blouza`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${SITE_URL}/shop?cat=karakou`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/shop?cat=hotesse`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/shipping`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic product pages
  let productPages: MetadataRoute.Sitemap = [];
  try {
    const products = await dbGetAllProducts(true); // active only
    productPages = products.map((p) => ({
      url: `${SITE_URL}/product/${p.id}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
      alternates: {
        languages: {
          ar: `${SITE_URL}/product/${p.id}?lang=ar`,
          fr: `${SITE_URL}/product/${p.id}?lang=fr`,
        },
      },
    }));
  } catch {
    // If DB unavailable, return static pages only
    console.warn("[sitemap] Could not fetch products");
  }

  return [...staticPages, ...productPages];
}
