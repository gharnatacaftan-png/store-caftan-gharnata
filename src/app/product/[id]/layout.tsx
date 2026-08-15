// Product page layout with dynamic SEO metadata fetched server-side
// The actual page UI is in page.tsx (client component)
import type { Metadata } from "next";
import { dbGetProductById } from "@/lib/products-db";

const SITE_URL = "https://www.caftan-gharnata.com";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const productId = Number(id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return { title: "منتج غير موجود | قفطان غرناطة" };
  }

  try {
    const product = await dbGetProductById(productId);

    if (!product || !product.is_active) {
      return { title: "منتج غير موجود | قفطان غرناطة" };
    }

    const nameAr = product.title;
    const nameFr = product.title_fr || product.title;
    const descAr = product.description?.slice(0, 160) || `قفطان غرناطة — ${nameAr}`;
    const descFr = product.description_fr?.slice(0, 160) || `Caftan Gharnata — ${nameFr}`;
    const image = product.primary_image || product.images?.[0] || `${SITE_URL}/logo.jpg`;
    const pageUrl = `${SITE_URL}/product/${product.id}`;

    // Determine canonical image URL
    const imageUrl = image.startsWith("http") ? image : `${SITE_URL}${image}`;

    const categoryKeywords: Record<string, string[]> = {
      caftan: ["قفطان", "caftan", "قفطان جزائري", "caftan algérien", "قفطان زفاف", "caftan mariage"],
      kabyle: ["كابيل", "robe kabyle", "رداء قبايل", "جبة قبايل"],
      blouza: ["بلوزة وهرانية", "blouza oranaise", "بلوزة", "blouza"],
      karakou: ["كراكو", "karakou", "كراكو جزائري"],
      hotesse: ["جبة استقبال", "robe hôtesse", "robe de cérémonie"],
    };

    const catKw = categoryKeywords[product.category_slug || "caftan"] || [];

    return {
      title: `${nameAr} | ${nameFr} — قفطان غرناطة`,
      description: `${descAr} | ${descFr}`,
      keywords: [nameAr, nameFr, "قفطان غرناطة", "caftan gharnata", ...catKw],
      alternates: {
        canonical: pageUrl,
        languages: {
          "ar-DZ": `${pageUrl}?lang=ar`,
          "fr-DZ": `${pageUrl}?lang=fr`,
        },
      },
      openGraph: {
        title: `${nameAr} — قفطان غرناطة`,
        description: descAr,
        url: pageUrl,
        type: "website",
        siteName: "قفطان غرناطة | Caftan Gharnata",
        locale: "ar_DZ",
        images: [
          {
            url: imageUrl,
            width: 800,
            height: 1000,
            alt: nameAr,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title: `${nameAr} — قفطان غرناطة`,
        description: descAr,
        images: [imageUrl],
      },
    };
  } catch {
    return {
      title: "قفطان غرناطة | Caftan Gharnata",
      description: "متجر القفطان الجزائري الأصيل",
    };
  }
}

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
