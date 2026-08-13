import "server-only";
import https from "https";
import { getSiteSettings } from "./settings";

interface OrderNotificationData {
  orderId: number;
  customerName: string;
  customerPhone: string;
  wilayaName: string;
  commune: string;
  shippingType: string;
  items: Array<{
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

export async function sendTestTelegramNotification(botToken: string, chatId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanToken = botToken.trim();
    const cleanChatId = normalizeTelegramChatId(chatId);
    if (!cleanToken || !cleanChatId) {
      return { ok: false, error: "Veuillez saisir le Bot Token et le Chat ID Telegram." };
    }

    const message = `🔔 رسالة اختبار - قفطان غرناطة\n\n✅ الاتصال بتليغرام يعمل بشكل صحيح.\n${new Date().toLocaleString("ar-DZ")}`;
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

    let itemsText = "";
    for (const item of data.items) {
      const sizeText = item.selected_size ? ` - المقاس: ${escapeHtml(item.selected_size)}` : "";
      const colorText = item.selected_color ? ` - اللون: ${escapeHtml(item.selected_color)}` : "";
      const qtyText = item.quantity > 1 ? ` ×${item.quantity}` : "";
      itemsText += `• ${escapeHtml(item.title || "منتج")}${sizeText}${colorText}${qtyText}: ${item.unit_price.toLocaleString("fr-FR")} دج\n`;
    }

    const message = `📦 طلب جديد رقم #${data.orderId}

👤 الاسم: ${escapeHtml(data.customerName)}
📞 الهاتف: ${escapeHtml(data.customerPhone)}
📍 الولاية: ${escapeHtml(data.wilayaName)}
🏠 البلدية: ${escapeHtml(data.commune)}
🚚 التوصيل: ${shippingTypeText}

🛍️ المنتجات:
${itemsText}
🚚 تكلفة التوصيل: ${data.shippingCost.toLocaleString("fr-FR")} دج
💰 المجموع: ${data.totalPrice.toLocaleString("fr-FR")} دج

اللغة: ${lang}
${new Date().toLocaleString("ar-DZ")}`;

    const result = await postToTelegram(botToken, chatId, message);

    if (!result.ok) {
      console.error("[telegram] Failed to send notification:", result.description);
      return false;
    }

    return true;
  } catch (err) {
    console.error("[telegram] Notification error:", err);
    return false;
  }
}
