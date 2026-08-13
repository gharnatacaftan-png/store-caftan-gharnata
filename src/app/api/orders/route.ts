// app/api/orders/route.ts - Public COD order submission (connected to D1)
import { NextRequest } from "next/server";
import { dbCreateOrder } from "@/lib/orders-db";
import { dbGetRateByCode } from "@/lib/shipping-db";
import { dbGetProductById } from "@/lib/products-db";
import { sendTelegramNotification } from "@/lib/notifications";
import { CreateOrderSchema } from "@/lib/validation";
import {
  rateLimit, getClientIp, sanitizeString,
  okResponse, errorResponse,
} from "@/lib/security";

export const runtime = "nodejs";
export const maxDuration = 10;

type PendingOrderItem = {
  product_id: number;
  title: string | null;
  selected_size: string | null;
  selected_color: string | null;
  quantity: number;
  unit_price: number;
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`orders:${ip}`, { windowMs: 10 * 60 * 1000, max: 15 })) {
    return errorResponse("Trop de commandes envoyees. Patientez un moment.", 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Requete invalide", 400);
  }

  // Validate with Zod
  const parsed = CreateOrderSchema.safeParse(body);
  if (!parsed.success) {
    const msg = parsed.error.issues.map(i => i.message).join("; ");
    return errorResponse(`Données invalides: ${msg}`, 400);
  }

  const data = parsed.data;
  const customerObj = (typeof data.customer === "object" && data.customer !== null) ? data.customer : {};

  const rawName = data.customerName ?? customerObj.name;
  const rawPhone = data.customerPhone ?? customerObj.phone;
  const rawWilaya = data.wilayaCode ?? customerObj.wilaya;
  const rawCommune = data.commune ?? customerObj.commune;
  const rawType = data.shippingType ?? data.deliveryType;
  const rawLang = data.lang ?? data.language;

  const lang = rawLang === "fr" || rawLang === "en" ? rawLang : "ar";
  const customerName = sanitizeString(rawName, 100);
  const customerPhone = sanitizeString(rawPhone, 30);
  const wilayaCode = Number(rawWilaya);
  const commune = sanitizeString(rawCommune, 100);
  const shippingType: "HOME" | "DESK" = (rawType === "DESK" || rawType === "bureau") ? "DESK" : "HOME";

  if (!customerName) return errorResponse("Nom et prenom obligatoires", 400);
  if (!/^0[5-7]\d{8}$/.test(customerPhone.replace(/\s/g, ""))) {
    return errorResponse("Numero de telephone invalide. Exemple: 0797823273", 400);
  }
  if (!Number.isInteger(wilayaCode) || wilayaCode < 1 || wilayaCode > 58) {
    return errorResponse("Veuillez choisir la wilaya", 400);
  }
  if (!commune) return errorResponse("Commune obligatoire", 400);

  const rawItems = Array.isArray(data.items) && data.items.length > 0 ? data.items : null;
  const items: PendingOrderItem[] = [];

  try {
    if (rawItems) {
      const requestedItems = rawItems.map((it) => ({
        productId: Number(it.productId ?? it.id),
        quantity: Math.max(1, Math.min(50, Number(it.quantity) || 1)),
        size: sanitizeString(it.size ?? it.selectedSize ?? "", 20),
        color: sanitizeString(it.color ?? it.selectedColor ?? "", 50),
      }));

      if (requestedItems.some((it) => !Number.isInteger(it.productId) || it.productId <= 0)) {
        return errorResponse("Produit invalide", 400);
      }

      const products = await Promise.all(requestedItems.map((it) => dbGetProductById(it.productId)));
      for (let i = 0; i < requestedItems.length; i++) {
        const requested = requestedItems[i];
        const product = products[i];
        if (!product || !product.is_active) {
          return errorResponse("Produit indisponible actuellement", 404);
        }
        items.push({
          product_id: requested.productId,
          title: product.title,
          selected_size: requested.size || null,
          selected_color: requested.color || null,
          quantity: requested.quantity,
          unit_price: product.price,
        });
      }
    } else {
      const productId = Number(data.productId);
      const selectedSize = sanitizeString(data.selectedSize ?? data.size ?? "", 20);
      const selectedColor = sanitizeString(data.selectedColor ?? data.color ?? "", 50);

      if (!Number.isInteger(productId) || productId <= 0) return errorResponse("Produit invalide", 400);
      const product = await dbGetProductById(productId);
      if (!product || !product.is_active) {
        return errorResponse("Produit indisponible actuellement", 404);
      }
      items.push({
        product_id: productId,
        title: product.title,
        selected_size: selectedSize || null,
        selected_color: selectedColor || null,
        quantity: 1,
        unit_price: product.price,
      });
    }
  } catch (err) {
    console.error("[orders POST] Product lookup failed:", err);
    return errorResponse("Erreur pendant la verification du produit", 500);
  }

  let shippingCost: number;
  let wilayaName = `Wilaya ${wilayaCode}`;
  try {
    const rate = await dbGetRateByCode(wilayaCode);
    if (!rate || !rate.is_deliverable) {
      return errorResponse("La livraison n'est pas disponible pour cette wilaya", 400);
    }
    shippingCost = shippingType === "HOME" ? rate.price_home : rate.price_desk;
    wilayaName = rate.wilaya_name || wilayaName;
  } catch (err) {
    console.error("[orders POST] Shipping lookup failed:", err);
    return errorResponse("Erreur pendant le calcul de la livraison", 500);
  }

  const subtotal = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
  const totalPrice = subtotal + shippingCost;

  try {
    const orderId = await dbCreateOrder({
      customer_name: customerName,
      customer_phone: customerPhone,
      wilaya_code: wilayaCode,
      commune,
      shipping_type: shippingType,
      items,
      shipping_cost: shippingCost,
      lang,
    });

    // Envoi de la notification Telegram AVANT de répondre : garanti d'être
    // exécuté quelle que soit la langue de la commande, le runtime (Workers
    // CF incl.) ou une déconnexion du client. Le message est toujours en
    // arabe. L'échec Telegram ne doit jamais faire échouer la commande.
    try {
      const sent = await sendTelegramNotification({
        orderId,
        customerName,
        customerPhone,
        wilayaName,
        commune,
        shippingType,
        items: items.map((it) => ({
          title: it.title,
          selected_size: it.selected_size,
          selected_color: it.selected_color,
          quantity: it.quantity,
          unit_price: it.unit_price,
        })),
        shippingCost,
        totalPrice,
        lang,
      });
      if (!sent) {
        console.warn(`[orders POST] Telegram notification was not delivered for order #${orderId}`);
      }
    } catch (err) {
      console.warn("[orders POST] Telegram notification error:", err);
    }

    return okResponse({ ok: true, orderId, shippingCost, totalPrice, deliveryPrice: shippingCost, itemCount: items.length });
  } catch (err) {
    console.error("[orders POST] Order creation failed:", err);
    return errorResponse("Erreur pendant l'enregistrement de la commande", 500);
  }
}
