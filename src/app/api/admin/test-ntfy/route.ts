import { NextRequest } from "next/server";
import { rejectUnsafeAdminRequest } from "@/lib/admin-api";
import { sendTestNtfyNotification } from "@/lib/notifications";
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
    const topic = String(body.topic || "").trim().replace(/\s+/g, "");

    // Persist the validated topic so order notifications (which read
    // `settings.ntfy_topic`) actually reach this channel.
    try {
      const up = await d1Execute(
        `UPDATE site_settings SET ntfy_topic = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'store'`,
        [topic]
      );
      if (up.changes === 0) {
        await d1Execute(
          `INSERT OR IGNORE INTO site_settings (id, phone1, phone2, whatsapp, instagram, ntfy_topic, updated_at)
           VALUES ('store', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          ["0561234567", "0671234567", "213561234567", "https://instagram.com/caftan_granada", topic]
        );
      }
    } catch (persistErr) {
      // Non-fatal: the test still sends so the admin sees whether the topic is reachable.
      console.warn("[test-ntfy] could not persist ntfy_topic to D1:", persistErr);
    }

    const result = await sendTestNtfyNotification(topic);
    if (result.ok) return okResponse({ ok: true });

    return errorResponse(result.error || "Erreur ntfy", 400);
  } catch (err: unknown) {
    console.error("[admin/test-ntfy]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return errorResponse(msg || "Server Error", 500);
  }
}
