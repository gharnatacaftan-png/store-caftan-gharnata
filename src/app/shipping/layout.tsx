// Metadata wrapper for the shipping page
import type { Metadata } from "next";

const SITE_URL = "https://store-caftan-gharnata.pages.dev";

export const metadata: Metadata = {
  title: "أسعار التوصيل | Tarifs de livraison — Caftan Granada",
  description:
    "أسعار شحن وتوصيل قفطان غرناطة لجميع ولايات الجزائر الـ 58. توصيل للمنزل أو للمكتب. Tarifs de livraison Caftan Granada pour toutes les 58 wilayas d'Algérie. Livraison à domicile ou en bureau.",
  alternates: {
    canonical: `${SITE_URL}/shipping`,
  },
  openGraph: {
    title: "أسعار التوصيل | Tarifs de livraison — Caftan Granada",
    description:
      "توصيل لجميع ولايات الجزائر — Livraison partout en Algérie.",
    url: `${SITE_URL}/shipping`,
    type: "website",
  },
};

export default function ShippingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
