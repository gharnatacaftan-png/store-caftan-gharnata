import "server-only";
import https from "https";
import { getSiteSettings } from "./settings";
import { formatDateTime } from "./time";

interface OrderNotificationData {
  orderId: number;
  customerName: string;
  customerPhone: string;
  wilayaName: string;
  commune: string;
  shippingType: string;
  items: Array<{
    product_id?: number;
    title: string | null;
    selected_size?: string | null;
    selected_color?: string | null;
    quantity: number;
    unit_price: number;
  }>;
  shippingCost: number;
  totalPrice: number;
  lang: string;
}

const TELEGRAM_TIMEOUT_MS = 4_000;
const STORE_URL = "https://www.caftan-gharnata.com";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function normalizeTelegramChatId(chatId: string): string {
  return chatId.trim().replace(/\s+/g, "");
}

function isConfiguredTelegramValue(value: string, placeholder: string): boolean {
  return Boolean(value) && value !== placeholder;
}

// Use Node.js native https to bypass fetch restrictions in some environments.
// Keep the timeout short: Telegram must never slow down checkout.
function postToTelegram(
  botToken: string,
  chatId: string,
  text: string,
  timeoutMs = TELEGRAM_TIMEOUT_MS
): Promise<{ ok: boolean; description?: string }> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify({
      chat_id: normalizeTelegramChatId(chatId),
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }), "utf8");

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${botToken}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": payload.length,
      },
      timeout: timeoutMs,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ ok: false, description: data }); }
      });
    });

    req.on("timeout", () => { req.destroy(); reject(new Error(`Telegram request timed out (${timeoutMs}ms)`)); });
    req.on("error", (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

// Send a document by public URL (Telegram fetches it itself). Best-effort: a
// failure here must never break the order — the text message is the primary
// notification. Used to attach the printable order/delivery slip (bon) per order.
function postDocumentToTelegram(
  botToken: string,
  chatId: string,
  documentUrl: string,
  caption: string,
  timeoutMs = TELEGRAM_TIMEOUT_MS
): Promise<{ ok: boolean; description?: string }> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(JSON.stringify({
      chat_id: normalizeTelegramChatId(chatId),
      document: documentUrl,
      caption,
      parse_mode: "HTML",
      disable_content_type_detection: true,
    }), "utf8");

    const options = {
      hostname: "api.telegram.org",
      path: `/bot${botToken}/sendDocument`,
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Length": payload.length,
      },
      timeout: timeoutMs,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch { resolve({ ok: false, description: data }); }
      });
    });

    req.on("timeout", () => { req.destroy(); reject(new Error(`Telegram request timed out (${timeoutMs}ms)`)); });
    req.on("error", (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

export async function sendTestTelegramNotification(botToken: string, chatId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanToken = botToken.trim();
    const cleanChatId = normalizeTelegramChatId(chatId);
    if (!cleanToken || !cleanChatId) {
      return { ok: false, error: "Veuillez saisir le Bot Token et le Chat ID Telegram." };
    }

    const message = `🔔 رسالة اختبار - قفطان غرناطة

✅ الاتصال بتليغرام يعمل بشكل صحيح.
${formatDateTime(new Date(), "ar-DZ")}`;
    const result = await postToTelegram(cleanToken, cleanChatId, message, 6_000);

    if (result.ok) return { ok: true };
    return { ok: false, error: `Telegram: ${result.description || "Unknown error"}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de connexion Telegram";
    return { ok: false, error: message };
  }
}

export async function sendTelegramNotification(data: OrderNotificationData): Promise<boolean> {
  try {
    const settings = await getSiteSettings();
    // Le token du bot est géré uniquement côté serveur : la variable
    // d'environnement TELEGRAM_BOT_TOKEN est la source de vérité, devant le
    // setting D1. Aucun token n'est plus embarqué dans le code client.
    const botToken = (
      process.env.TELEGRAM_BOT_TOKEN?.trim() ||
      settings.telegram_bot_token?.trim() ||
      ""
    ).trim();
    const chatId = normalizeTelegramChatId(
      settings.telegram_chat_id?.trim() ||
      process.env.TELEGRAM_CHAT_ID?.trim() ||
      ""
    );

    if (settings.telegram_enabled === false) {
      console.log("[telegram] Notifications disabled in settings, skipping");
      return false;
    }

    if (!isConfiguredTelegramValue(botToken, "YOUR_BOT_TOKEN") || !isConfiguredTelegramValue(chatId, "YOUR_CHAT_ID")) {
      console.warn("[telegram] Bot token or chat ID not configured, skipping notification");
      return false;
}

    const lang = data.lang === "fr" ? "الفرنسية" : data.lang === "en" ? "الإنجليزية" : "العربية";
    const shippingTypeText = data.shippingType === "HOME" ? "المنزل 🏠" : "مكتب البريد (Stop Desk) 🏢";

    // Build a detailed, scannable line per product: name + size + color + qty +
    // unit price + line total. La vendeuse n'a pas le mot de passe du dashboard,
    // donc la notification doit contenir TOUTES les infos produit de la commande.
    // Le nom de produit est toujours en arabe (colonne `title` du produit) et mis
    // en gras pour rester visible même si le fallback est utilisé.
    const itemsText = data.items
      .map((item, i) => {
        const sizeText = item.selected_size ? ` | المقاس: ${escapeHtml(item.selected_size)}` : "";
        const colorText = item.selected_color ? ` | اللون: ${escapeHtml(item.selected_color)}` : "";
        const unit = item.unit_price.toLocaleString("fr-FR");
        const lineTotal = (item.unit_price * item.quantity).toLocaleString("fr-FR");
        const productLink = item.product_id
          ? `\n   🔗 <a href="${STORE_URL}/product/${item.product_id}">عرض المنتق في المتجر</a>`
          : "";
        const productName = escapeHtml(item.title ?? "") || "اسم المنتج غير محدد";
        return `• ${i + 1}. المنتج: <b>${productName}</b>${sizeText}${colorText}\n   الكمية: ${item.quantity} × ${unit} دج = ${lineTotal} دج${productLink}`;
      })
      .join("\n");

    const message = `🛒 طلب جديد #${data.orderId} — قفطان غرناطة

👤 العميل: ${escapeHtml(data.customerName)}
📞 الهاتف: ${escapeHtml(data.customerPhone)}
📍 الولاية: ${escapeHtml(data.wilayaName)}
🏠 البلدية: ${escapeHtml(data.commune)}
🚚 نوع التوصيل: ${shippingTypeText}
🌐 اللغة: ${lang}

🛍️ المنتجات:
${itemsText}

🧾 <a href="${STORE_URL}/bon/${data.orderId}?lang=${encodeURIComponent(data.lang ?? "ar")}">بون الشراء / Bon de livraison — فتح / تحميل</a>

💳 تكلفة التوصيل: ${data.shippingCost.toLocaleString("fr-FR")} دج
💰 المجموع الكلي: ${data.totalPrice.toLocaleString("fr-FR")} دج

🕒 ${formatDateTime(new Date(), "ar-DZ")}`;

    // Send the message AND the printable order/delivery slip (bon) in parallel.
    // The bon is attached as a document (Telegram fetches its public URL). The
    // document call is best-effort: if it fails/times out we keep the message.
    const docUrl = `${STORE_URL}/bon/${data.orderId}?type=livraison&lang=${encodeURIComponent(data.lang ?? "ar")}`;
    const docCaption = `📄 بون الطلب #${data.orderId} — قفطان غرناطة`;

    const messageP = postToTelegram(botToken, chatId, message).catch((e: unknown) => ({
      ok: false,
      description: e instanceof Error ? e.message : "message failed",
    }));
    const docP = postDocumentToTelegram(botToken, chatId, docUrl, docCaption).catch((e: unknown) => ({
      ok: false,
      description: e instanceof Error ? e.message : "document failed",
    }));

    const [msgResult, docResult] = await Promise.all([messageP, docP]);

    if (!msgResult.ok) {
      console.error("[telegram] Failed to send notification:", msgResult.description);
      return false;
    }
    if (!docResult.ok) {
      // Non-fatal: the order + product details are already in the text message.
      console.warn("[telegram] Order slip document not sent for order #", data.orderId, "-", docResult.description);
    }

    return true;
  } catch (err) {
    console.error("[telegram] Notification error:", err);
    return false;
  }
}
