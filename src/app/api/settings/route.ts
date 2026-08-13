import { NextRequest } from "next/server";
import { getSiteSettings } from "@/lib/settings";
import { rateLimit, getClientIp, okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";

// Public read of store settings (phone, WhatsApp, Instagram) used by the
// footer and WhatsApp button. No admin session required — this is not
// sensitive data. Settings change rarely, so a short public cache is fine.
export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  if (!rateLimit(`settings:${ip}`, { windowMs: 60_000, max: 120 })) {
    return errorResponse("Too many requests", 429);
  }

  try {
    const settings = await getSiteSettings();
    // SÉCURITÉ : ne jamais exposer en public des champs sensibles (token et
    // chat_id Telegram). On ne renvoie que les données vitrine.
    const {
      telegram_bot_token: _tok,
      telegram_chat_id: _chat,
      telegram_enabled: _enabled,
      ...publicSettings
    } = settings as unknown as Record<string, unknown>;
    // private: only the visitor's browser may cache (a CDN must not, otherwise
    // dashboard changes — social toggles, phones — would take minutes to reach
    // the storefront/footer/slips). 30 s keeps D1 load low while staying snappy.
    return okResponse(publicSettings, 200, { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" });
  } catch (err) {
    console.error("[settings GET]", err);
    return errorResponse("خطأ في جلب الإعدادات", 500);
  }
}
