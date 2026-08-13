// lib/validation.ts — Zod schemas for API request validation
import { z } from "zod";

// ---------------------------------------------------------------------------
// Orders — POST /api/orders (public COD checkout)
// ---------------------------------------------------------------------------
const OrderItemSchema = z.object({
  productId: z.number().int().positive(),
  id: z.number().int().positive().optional(),
  quantity: z.number().int().min(1).max(50).default(1),
  size: z.string().max(20).optional(),
  selectedSize: z.string().max(20).optional(),
  color: z.string().max(50).optional(),
  selectedColor: z.string().max(50).optional(),
});

const CustomerObjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).optional(),
  wilaya: z.union([z.number(), z.string()]).optional(),
  commune: z.string().max(100).optional(),
}).optional();

export const CreateOrderSchema = z.object({
  // Flexible field names for compatibility with different frontend shapes
  customerName: z.string().min(1).max(100).optional(),
  customerPhone: z.string().max(30).optional(),
  wilayaCode: z.union([z.number(), z.string()]).optional(),
  commune: z.string().max(100).optional(),
  shippingType: z.enum(["HOME", "DESK", "home", "bureau", "domicile"]).optional(),
  deliveryType: z.enum(["HOME", "DESK", "home", "bureau", "domicile"]).optional(),
  lang: z.string().optional(),
  language: z.string().optional(),

  // Product info (single-item legacy)
  productId: z.union([z.number(), z.string()]).optional(),
  selectedSize: z.string().max(20).optional(),
  size: z.string().max(20).optional(),
  selectedColor: z.string().max(50).optional(),
  color: z.string().max(50).optional(),

  // Multi-item cart
  items: z.array(OrderItemSchema).min(1).max(50).optional(),

  // Nested customer object
  customer: CustomerObjectSchema,
}).refine(
  (data) => {
    // Must have either items array or single productId
    return (data.items && data.items.length > 0) || data.productId;
  },
  { message: "Either 'items' array or 'productId' is required" }
);

// ---------------------------------------------------------------------------
// Products — POST /api/admin/products (admin create)
// ---------------------------------------------------------------------------
const ColorSchema = z.object({
  id: z.string().max(50).optional(),
  name: z.string().max(50),
  value: z.string().max(30).default("#D4AF37"),
});

export const CreateProductSchema = z.object({
  title: z.string().min(1).max(150),
  name: z.string().min(1).max(150).optional(),
  description: z.string().max(2000).optional(),
  title_fr: z.string().max(150).optional(),
  title_en: z.string().max(150).optional(),
  description_fr: z.string().max(2000).optional(),
  description_en: z.string().max(2000).optional(),
  price: z.number().int().min(1).max(10_000_000),
  category_id: z.number().int().positive().optional(),
  categoryId: z.number().int().positive().optional(),
  is_featured: z.boolean().optional(),
  featured: z.boolean().optional(),
  sizes: z.array(z.string().max(50)).max(20).optional(),
  colors: z.array(ColorSchema).max(20).optional(),
  color_media_map: z.record(z.string(), z.array(z.string())).optional(),
  primary_image: z.any().optional(),
  images: z.array(z.any()).max(30).optional(),
  videos: z.array(z.any()).max(10).optional(),
});

export const UpdateProductSchema = CreateProductSchema.partial().extend({
  id: z.number().int().positive(),
  is_active: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Shipping rates — POST /api/admin/shipping
// ---------------------------------------------------------------------------
export const ShippingRateUpdateSchema = z.array(z.object({
  code: z.number().int().min(1).max(58),
  price_home: z.number().int().min(0).max(5000),
  price_desk: z.number().int().min(0).max(5000),
  domicile: z.number().int().min(0).max(5000).optional(),
  bureau: z.number().int().min(0).max(5000).optional(),
})).min(1).max(100);

export const CreateWilayaSchema = z.object({
  wilaya_code: z.number().int().min(1).max(999),
  wilaya_name: z.string().min(1).max(100),
  name_fr: z.string().min(1).max(100),
  name_en: z.string().min(1).max(100),
  price_home: z.number().int().min(0).max(5000),
  price_desk: z.number().int().min(0).max(5000),
});

export const UpdateWilayaSchema = z.object({
  wilaya_code: z.number().int().min(1).max(999),
  wilaya_name: z.string().min(1).max(100).optional(),
  name_fr: z.string().min(1).max(100).optional(),
  name_en: z.string().min(1).max(100).optional(),
  price_home: z.number().int().min(0).max(5000).optional(),
  price_desk: z.number().int().min(0).max(5000).optional(),
});

// ---------------------------------------------------------------------------
// Admin order status update — PATCH /api/admin/orders
// ---------------------------------------------------------------------------
export const UpdateOrderStatusSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"]),
});

// ---------------------------------------------------------------------------
// Settings — POST /api/admin/settings
// ---------------------------------------------------------------------------
export const UpdateSettingsSchema = z.object({
  phone1: z.string().min(1).max(20),
  phone2: z.string().max(20).optional(),
  phone3: z.string().max(20).optional(),
  whatsapp: z.string().min(1).max(30),
  instagram: z.string().max(500).optional(),
  hero_image: z.string().max(2000).nullable().optional(),
  facebook: z.string().max(500).optional(),
  tiktok: z.string().max(500).optional(),
  x_link: z.string().max(500).optional(),
  location_url: z.string().max(500).optional(),
  instagram_enabled: z.boolean().optional(),
  facebook_enabled: z.boolean().optional(),
  tiktok_enabled: z.boolean().optional(),
  x_enabled: z.boolean().optional(),
  location_enabled: z.boolean().optional(),
  phone1_enabled: z.boolean().optional(),
  phone2_enabled: z.boolean().optional(),
  phone3_enabled: z.boolean().optional(),
  address1: z.string().max(300).optional(),
  address1_url: z.string().max(500).optional(),
  address2: z.string().max(300).optional(),
  address2_url: z.string().max(500).optional(),
  address3: z.string().max(300).optional(),
  address3_url: z.string().max(500).optional(),
  address4: z.string().max(300).optional(),
  address4_url: z.string().max(500).optional(),
  address1_enabled: z.boolean().optional(),
  address2_enabled: z.boolean().optional(),
  address3_enabled: z.boolean().optional(),
  address4_enabled: z.boolean().optional(),
  telegram_bot_token: z.string().max(200).optional(),
  telegram_chat_id: z.string().max(50).optional(),
  telegram_enabled: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Track — POST /api/track
// ---------------------------------------------------------------------------
export const TrackVisitSchema = z.object({
  path: z.string().max(300).default("/"),
});

// ---------------------------------------------------------------------------
// Gallery — POST /api/admin/gallery
// ---------------------------------------------------------------------------
export const GalleryUpdateSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("hero"), imageUrl: z.string().max(2000).optional() }),
  z.object({ type: z.literal("category"), categoryId: z.number().int().positive(), imageUrl: z.string().max(2000).optional() }),
  z.object({ type: z.literal("category-active"), categoryId: z.number().int().positive(), active: z.boolean() }),
]);
