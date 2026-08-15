// Metadata wrapper for the shop page — must be a Server Component to export metadata.
// The actual UI lives in the client component (shop/page.tsx).
import type { Metadata } from "next";

const SITE_URL = "https://store-caftan-gharnata.pages.dev";

export const metadata: Metadata = {
  title: "متجر الملابس التقليدية الجزائرية | Boutique Robes Algériennes",
  description:
    "تسوّقي أرقى القفاطن والملابس الجزائرية التقليدية: قفطان، كابيل، بلوزة وهرانية، كراكو — توصيل لجميع ولايات الجزائر. Achetez des robes traditionnelles algériennes: caftan, robe kabyle, blouza oranaise, karakou — livraison partout en Algérie.",
  alternates: {
    canonical: `${SITE_URL}/shop`,
    languages: {
      "ar-DZ": `${SITE_URL}/shop?lang=ar`,
      "fr-DZ": `${SITE_URL}/shop?lang=fr`,
    },
  },
  openGraph: {
    title: "متجر قفطان غرناطة | Boutique Caftan Granada",
    description:
      "قفطان، كابيل، بلوزة وهرانية، كراكو — توصيل لجميع ولايات الجزائر. Caftan, robe kabyle, blouza — livraison partout en Algérie.",
    url: `${SITE_URL}/shop`,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "متجر قفطان غرناطة",
      },
    ],
  },
};

export { default } from "./page";
