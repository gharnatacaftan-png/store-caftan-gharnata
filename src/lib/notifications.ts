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

// ntfy.sh mirror (optional, opt-in). A single topic string is enough — the
// subscriber just opens https://ntfy.sh/<topic> to receive notifications.
const NTFY_HOST = "ntfy.sh";
const NTFY_TIMEOUT_MS = 4_000;
const NTFY_DEFAULT_TAGS = "shopping_cart,receipt_receiver";

// ntfy.sh (and the Cloudflare edge in front of it) reject non-ASCII bytes in
// HTTP HEADERS (Title, Tags, Click, ...). The message BODY may stay UTF-8
// (Arabic, emoji, ...), but every header value MUST be pure ASCII. This strips
// anything non-ASCII so we never crash an order notification over a header.
// ntfy.sh (and the Cloudflare edge in front of it) reject non-ASCII bytes in
// HTTP HEADERS (Title, Tags, Click, ...). The message BODY may stay UTF-8
// (Arabic, emoji, ...), but every header value MUST be pure ASCII. This strips
// anything non-ASCII so we never crash an order notification over a header.
function sanitizeNtfyHeader(value: string): string {
  return String(value ?? "")
    .split("")
    .filter((c) => c.charCodeAt(0) <= 127)
    .join("")
    .trim();
}

// A single ntfy_topic column stores ONE or SEVERAL topics separated by spaces,
// commas, semicolons or newlines — mirroring the Telegram multi-chat input.
// ntfy topics are single tokens (no spaces), so stripping internal whitespace
// per token is safe. Empty/duplicate entries are dropped.
export function parseNtfyTopics(value: unknown): string[] {
  return Array.from(
    new Set(
      String(value ?? "")
        .split(/[\s;,\n\r]+/)
        .map((t) => t.trim().replace(/\s+/g, ""))
        .filter(Boolean)
    )
  );
}

// Canonical stored form for ntfy_topic (";" separated). Reused by the API so
// the DB and the client agree on the multi-topic encoding.
export function cleanNtfyTopics(value: unknown): string {
  return parseNtfyTopics(value).join(";");
}

// ntfy.sh is plain-text/Markdown, NOT HTML: it cannot render Telegram's HTML
// markup (<b>, <a>). Post the Markdown header (already done by postToNtfy) and
// convert Telegram HTML to Markdown so ntfy shows the EXACT same content as
// Telegram, with blue clickable links like [text](url) instead of raw URLs.
function ntfyMarkdown(tgHtml: string): string {
  return tgHtml
    .replace(/<a href="([^"]+)">([\s\S]*?)<\/a>/g, (_m, url: string, text: string) => {
      const safeUrl = url.replace(/\(/g, "%28").replace(/\)/g, "%29");
      return `[${text}](${safeUrl})`;
    })
    .replace(/<b>(.*?)<\/b>/g, "**$1**")
    .replace(/<[^>]+>/g, "");
}



function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

import { parseTelegramChatIds, normalizeTelegramChatId } from "./telegram-utils";

export { parseTelegramChatIds, normalizeTelegramChatId };

// Use Node.js native https to bypass fetch restrictions in some environments.
// Keep the timeout short: Telegram must never slow down checkout.

function isConfiguredTelegramValue(value: string, placeholder: string): boolean {
  return Boolean(value) && value !== placeholder;
}

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

// POST to ntfy.sh/<topic>. Best-effort: a failure here must never break the
// order — ntfy is a convenience mirror of the Telegram notification.
function postToNtfy(
  topic: string,
  title: string,
  message: string,
  opts: { clickUrl?: string; priority?: string; tags?: string } = {},
  timeoutMs = NTFY_TIMEOUT_MS
): Promise<{ ok: boolean; description?: string }> {
  return new Promise((resolve, reject) => {
    const payload = Buffer.from(message, "utf8");
    const path = `/${encodeURIComponent(topic)}`;
    const options = {
      hostname: NTFY_HOST,
      path,
      method: "POST",
       headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Length": String(payload.length),
        "Title": sanitizeNtfyHeader(title),
        "Markdown": "yes",
        "Priority": sanitizeNtfyHeader(opts.priority || "4"),
        "Tags": sanitizeNtfyHeader(opts.tags || NTFY_DEFAULT_TAGS),
        ...(opts.clickUrl ? { "Click": sanitizeNtfyHeader(opts.clickUrl) } : {}),
      },
      timeout: timeoutMs,
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({ ok: res.statusCode === 200, description: res.statusCode !== 200 ? `HTTP ${res.statusCode} ${data}` : undefined });
      });
    });
    req.on("timeout", () => { req.destroy(); reject(new Error(`ntfy request timed out (${timeoutMs}ms)`)); });
    req.on("error", (e) => reject(e));
    req.write(payload);
    req.end();
  });
}

export async function sendTestNtfyNotification(topics: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const list = parseNtfyTopics(topics);
    if (list.length === 0) {
      return { ok: false, error: "Veuillez saisir au moins un Topic ntfy.sh." };
    }

    const message = `🔔 رسالة اختبار - قفطان غرناطة

✅ الاتصال بـ ntfy.sh يعمل بشكل صحيح.
${formatDateTime(new Date(), "ar-DZ")}`;

    const outcomes: Array<{ topic: string; ok: boolean; description?: string }> = [];
    for (const topic of list) {
      const result = await postToNtfy(topic, "Caftan Gharnata - ntfy test", message, {}, 6_000);
      outcomes.push({ topic, ok: result.ok, description: result.description });
    }

    const failed = outcomes.filter((o) => !o.ok);
    if (failed.length === 0) return { ok: true };
    return {
      ok: false,
      error: `ntfy: ${failed.map((f) => `${f.topic} (${f.description || "unknown"})`).join(", ")}`,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erreur de connexion ntfy";
    return { ok: false, error: message };
  }
}

export async function sendTestTelegramNotification(botToken: string, chatId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const cleanToken = botToken.trim();
    const chatIds = parseTelegramChatIds(chatId);
    if (!cleanToken || chatIds.length === 0) {
      return { ok: false, error: "Veuillez saisir le Bot Token et au moins un Chat ID Telegram." };
    }

    const message = `🔔 رسالة اختبار - قفطان غرناطة

✅ الاتصال بتليغرام يعمل بشكل صحيح.
${formatDateTime(new Date(), "ar-DZ")}`;

    const results = await Promise.all(
      chatIds.map((id) =>
        postToTelegram(cleanToken, id, message, 6_000).catch((e: unknown) => ({
          ok: false,
          description: e instanceof Error ? e.message : "message failed",
        }))
      )
    );

    const failed = results.filter((r) => !r.ok);
    if (failed.length === 0) return { ok: true };
    return {
      ok: false,
      error: `Telegram: ${failed.map((f) => f.description || "Unknown error").join(", ")}`,
    };
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
    const chatIds = parseTelegramChatIds(
      settings.telegram_chat_id?.trim() ||
      process.env.TELEGRAM_CHAT_ID?.trim() ||
      ""
    );
     const ntfyTopics = parseNtfyTopics(
       settings.ntfy_topic?.trim() ||
       process.env.NTFY_TOPIC?.trim() ||
       ""
     );

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
    // A single order can be delivered to several Telegram accounts at once: we
    // fan out to every configured chat id.
    const docUrl = `${STORE_URL}/bon/${data.orderId}?type=livraison&lang=${encodeURIComponent(data.lang ?? "ar")}`;
    const docCaption = `📄 بون الطلب #${data.orderId} — قفطان غرناطة`;

    // Optional ntfy.sh mirror — best-effort, never blocks the Telegram path or
    // the order. Sent only when enabled + topic configured. Tracked so the
    // function can report overall success even if Telegram is disabled.
    let ntfyDelivered = false;
    if (settings.ntfy_enabled !== false && ntfyTopics.length > 0) {
      const ntfyTitle = `New order #${data.orderId} - Caftan Gharnata`;
      // EXACT same content as the Telegram message (Arabic, prices, every
      // product line, client info, bon link) — rendered as Markdown so ntfy
      // shows it like Telegram: blue clickable links, bold product names.
      const ntfyMessage = ntfyMarkdown(message);
      // Fan out to EVERY configured ntfy channel (multi-topic support).
      for (const topic of ntfyTopics) {
        const ok = await postToNtfy(topic, ntfyTitle, ntfyMessage, { clickUrl: docUrl }, NTFY_TIMEOUT_MS)
          .then((r) => r.ok)
          .catch((e: unknown) => {
            console.warn(`[ntfy] send to channel "${topic}" failed:`, e instanceof Error ? e.message : e);
            return false;
          });
        if (ok) ntfyDelivered = true;
      }
    }

    // A single order can be delivered to several Telegram accounts at once: we
    // fan out to every configured chat id. Skipped entirely (not failed) when
    // Telegram is disabled or not configured — ntfy can still deliver.
    let delivered = false;
    const telegramReady =
      settings.telegram_enabled !== false &&
      isConfiguredTelegramValue(botToken, "YOUR_BOT_TOKEN") &&
      chatIds.length > 0 &&
      chatIds.some((id) => isConfiguredTelegramValue(id, "YOUR_CHAT_ID"));

    if (telegramReady) {
      const results = await Promise.all(
        chatIds.map(async (chatId) => {
          const messageP = postToTelegram(botToken, chatId, message).catch((e: unknown) => ({
            ok: false,
            description: e instanceof Error ? e.message : "message failed",
          }));
          const docP = postDocumentToTelegram(botToken, chatId, docUrl, docCaption).catch((e: unknown) => ({
            ok: false,
            description: e instanceof Error ? e.message : "document failed",
          }));
          const [msgResult, docResult] = await Promise.all([messageP, docP]);
          return { chatId, msgResult, docResult };
        })
      );

      for (const { chatId, msgResult, docResult } of results) {
        if (msgResult.ok) {
          delivered = true;
        } else {
          console.error("[telegram] Failed to send notification to chat", chatId, "-", msgResult.description);
        }
        if (!docResult.ok) {
          // Non-fatal: the order + product details are already in the text message.
          console.warn("[telegram] Order slip document not sent for order #", data.orderId, "to chat", chatId, "-", docResult.description);
        }
      }
    } else if (settings.telegram_enabled === false) {
      console.log("[telegram] Notifications disabled in settings, skipping");
    } else {
      console.warn("[telegram] Bot token or chat ID(s) not configured, skipping telegram");
    }

    return delivered || ntfyDelivered;
  } catch (err) {
    console.error("[telegram] Notification error:", err);
    return false;
  }
}

