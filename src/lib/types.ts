// Shared types and constants for the application (Client & Server safe)

// --- SHIPPING ---
export interface ShippingRate {
  code: string;
  name: string;
  nameAr: string;
  domicile: number;
  bureau: number;
}

// --- ORDERS ---
export type OrderStatus = "new" | "confirmed" | "shipping" | "delivered" | "cancelled";

export interface Order {
  id: string;
  productId: string;
  productName: string;
  category: string;
  size: string;
  color: string;
  customer: {
    name: string;
    phone: string;
    wilaya: string;
    wilayaName: string;
    commune: string;
  };
  deliveryType: "domicile" | "bureau";
  productPrice: number;
  deliveryPrice: number;
  total: number;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
}

// --- PRODUCTS ---
export type ProductCategory = "caftan" | "kabyle" | "blouza" | "karakou" | "hotesse";

/** Get a localized product field (name or description) based on the selected language. */
export function getLocalizedField(
  lang: string,
  fallback: string,
  fr?: string,
  en?: string,
): string {
  if (lang === "fr" && fr) return fr;
  if (lang === "en" && en) return en;
  return fallback;
}

export const CATEGORIES: Record<ProductCategory, { fr: string; ar: string }> = {
  caftan:   { fr: "Caftans",            ar: "القفطان" },
  kabyle:   { fr: "Robes kabyles",      ar: "جبب قبايل" },
  blouza:   { fr: "Blouza oranaise",    ar: "البلوزة الوهرانية" },
  karakou:  { fr: "Karakou",            ar: "الكراكو" },
  hotesse:  { fr: "Robes d'hôtesse",    ar: "جبة إستقبال" },
};

export interface Product {
  id: string;
  name: string;
  name_fr?: string;
  name_en?: string;
  category: ProductCategory;
  price: number;
  description: string;
  description_fr?: string;
  description_en?: string;
  sizes: string[];
  colors: Array<{ id: string; name: string; value: string }>;
  color_media_map?: Record<string, string[]>;
  primary_image?: string | null;
  images: string[];
  videos?: string[];
  mediaSizeBytes?: number;
  stock: "available" | "out_of_stock";
  featured: boolean;
  createdAt: string;
}
