// Metadata wrapper for the shipping page
import type { Metadata } from "next";

const SITE_URL = "https://www.caftan-gharnata.com";

export const metadata: Metadata = {
  title: "أسعار التوصيل | Tarifs de livraison — Caftan Gharnata",
  description:
    "أسعار شحن وتوصيل قفطان غرناطة لجميع ولايات الجزائر الـ 58. توصيل للمنزل أو للمكتب. Tarifs de livraison Caftan Gharnata pour toutes les 58 wilayas d'Algérie. Livraison à domicile ou en bureau.",
  alternates: {
    canonical: `${SITE_URL}/shipping`,
  },
  openGraph: {
    title: "أسعار التوصيل | Tarifs de livraison — Caftan Gharnata",
    description:
      "توصيل لجميع ولايات الجزائر — Livraison partout en Algérie.",
    url: `${SITE_URL}/shipping`,
    type: "website",
    images: [
      {
        url: `${SITE_URL}/logo.jpg`,
        width: 1200,
        height: 630,
        alt: "قفطان غرناطة — أسعار التوصيل",
      },
    ],
  },
};

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
