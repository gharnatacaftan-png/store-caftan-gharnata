// app/robots.ts — Native Next.js robots.txt (replaces the /api/robots route)
import { MetadataRoute } from "next";

const SITE_URL = "https://www.caftan-gharnata.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/shop", "/product/", "/shipping"],
        disallow: [
          "/gharnata-portal-x92/",
          "/api/",
          "/bon/",
        ],
      },
      // Specifically allow Googlebot full access to public pages
      {
        userAgent: "Googlebot",
        allow: ["/", "/shop", "/product/", "/shipping"],
        disallow: [
          "/gharnata-portal-x92/",
          "/api/",
          "/bon/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
