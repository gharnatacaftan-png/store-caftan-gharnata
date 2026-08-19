import { NextRequest } from "next/server";
import { getSiteSettings, updateSiteSettings } from "@/lib/settings";
import { isAdminRequest, rejectUnsafeAdminRequest } from "@/lib/admin-api";
import { parseTelegramChatIds } from "@/lib/notifications";
import { okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function cleanTelegramChatId(value: unknown): string {
  // Plusieurs chat id séparés par des sauts de ligne, des points-virgules ou
  // des virgules → normalisés en une liste point-virgule séparée.
  return parseTelegramChatIds(String(value || "")).join(";");
}

function cleanNtfyTopic(value: unknown): string {
  // ntfy.sh topic: on garde une seule valeur, espaces éliminés.
  return String(value || "").trim().replace(/\s+/g, "");
}

export async function GET(req: NextRequest) {
  if (!await isAdminRequest(req)) return errorResponse("Unauthorized", 401);
  const settings = await getSiteSettings();
  return okResponse(settings as unknown as Record<string, unknown>);
}

export async function POST(req: NextRequest) {
  const rejection = await rejectUnsafeAdminRequest(req);
  if (rejection) return rejection;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Requete invalide", 400);
  }

  if (!body.phone1 || !body.whatsapp || !body.instagram) {
    return errorResponse("Missing required settings", 400);
  }

  // The settings form doesn't manage the hero image (gallery page does), so
  // when it's absent from the payload, preserve the current value instead of
  // wiping it back to the bundled default.
  const current = await getSiteSettings();

  const settings = await updateSiteSettings({
    phone1: String(body.phone1),
    phone2: String(body.phone2 || ""),
    whatsapp: String(body.whatsapp),
    instagram: String(body.instagram),
    hero_image: body.hero_image === undefined
      ? current.hero_image
      : (body.hero_image ? String(body.hero_image) : null),
    facebook: body.facebook ? String(body.facebook) : "",
    tiktok: body.tiktok ? String(body.tiktok) : "",
    x_link: body.x_link ? String(body.x_link) : "",
    location_url: body.location_url ? String(body.location_url) : "",
    instagram_enabled: body.instagram_enabled === true,
    facebook_enabled: body.facebook_enabled === true,
    tiktok_enabled: body.tiktok_enabled === true,
    x_enabled: body.x_enabled === true,
    location_enabled: body.location_enabled === true,
    phone3: body.phone3 ? String(body.phone3) : "",
    phone1_enabled: body.phone1_enabled === true,
    phone2_enabled: body.phone2_enabled === true,
    phone3_enabled: body.phone3_enabled === true,
    address1: body.address1 ? String(body.address1) : "",
    address1_url: body.address1_url ? String(body.address1_url) : "",
    address2: body.address2 ? String(body.address2) : "",
    address2_url: body.address2_url ? String(body.address2_url) : "",
    address3: body.address3 ? String(body.address3) : "",
    address3_url: body.address3_url ? String(body.address3_url) : "",
    address4: body.address4 ? String(body.address4) : "",
    address4_url: body.address4_url ? String(body.address4_url) : "",
    address4_enabled: body.address4_enabled === true,
    address1_enabled: body.address1_enabled === true,
    address2_enabled: body.address2_enabled === true,
    address3_enabled: body.address3_enabled === true,
// Le token du bot n'est PAS reçu du client (sécurité) : on conserve la
    // valeur courante en base, ou la variable d'environnement si la base est
    // vide. L'utilisateur ne peut changer que le chat_id.
    telegram_bot_token:
      current.telegram_bot_token?.trim() ||
      process.env.TELEGRAM_BOT_TOKEN?.trim() ||
      "",
    telegram_chat_id: cleanTelegramChatId(body.telegram_chat_id),
    telegram_enabled: body.telegram_enabled === true,
    ntfy_topic: cleanNtfyTopic(body.ntfy_topic),
    ntfy_enabled: body.ntfy_enabled === true,
  });

  return okResponse({ ok: true, settings: settings as unknown as Record<string, unknown> });
}
