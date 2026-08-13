import { NextRequest } from "next/server";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import { sendTestTelegramNotification } from "@/lib/notifications";
import { getSiteSettings } from "@/lib/settings";
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
    const chatId = String(body.chatId || "").trim();

    const result = await sendTestTelegramNotification(botToken, chatId);
    if (result.ok) return okResponse({ ok: true });

    return errorResponse(result.error || "Erreur Telegram", 400);
  } catch (err: unknown) {
    console.error("[admin/test-telegram]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg || "Server Error", 500);
  }
}
