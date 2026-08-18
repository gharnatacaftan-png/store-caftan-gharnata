import { NextRequest } from "next/server";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import { sendTestTelegramNotification, parseTelegramChatIds } from "@/lib/notifications";
import { getSiteSettings } from "@/lib/settings";
import { d1Execute } from "@/lib/db";
import { okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 10;

export async function POST(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  try {
    const body = await req.json();
    // Le token du bot est résolu côté serveur (env puis D1) — on n'accepte
    // jamais un token envoyé par le client.
    const settings = await getSiteSettings();
    const botToken =
      process.env.TELEGRAM_BOT_TOKEN?.trim() ||
      settings.telegram_bot_token?.trim() ||
      "";
    // Accept several chat ids (one per line, or separated by ; / ,). We persist
    // the normalized, semicolon-joined string so order notifications reach every
    // account — not just the last one typed in the test box.
    const chatId = parseTelegramChatIds(String(body.chatId || "")).join(";");

    // Persist the chat id(s) the admin is validating so they become the exact
    // value used by order notifications (/api/orders reads
    // `settings.telegram_chat_id` from this same D1 row). Otherwise the
    // "Test message" could pass while the next order still goes to a stale id.
    try {
      const up = await d1Execute(
        `UPDATE site_settings SET telegram_chat_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'store'`,
        [chatId]
      );
      if (up.changes === 0) {
        await d1Execute(
          `INSERT OR IGNORE INTO site_settings (id, phone1, phone2, whatsapp, instagram, telegram_chat_id, telegram_enabled, phone1_enabled, instagram_enabled, updated_at)
           VALUES ('store', '0561234567', '0671234567', '213561234567', 'https://instagram.com/caftan_granada', ?, 1, 1, 1, CURRENT_TIMESTAMP)`,
          [chatId]
        );
      }
    } catch (persistErr) {
      // Non-fatal: the test still sends so the admin sees whether the chat is reachable.
      console.warn("[test-telegram] could not persist chat_id to D1:", persistErr);
    }

    const result = await sendTestTelegramNotification(botToken, String(body.chatId || ""));
    if (result.ok) return okResponse({ ok: true });

    return errorResponse(result.error || "Erreur Telegram", 400);
  } catch (err: unknown) {
    console.error("[admin/test-telegram]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg || "Server Error", 500);
  }
}
