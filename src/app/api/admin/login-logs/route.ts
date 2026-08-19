// app/api/admin/login-logs/route.ts — List admin login audit events (admin only)
import { NextRequest } from "next/server";
import { requireAdminSession, okResponse, errorResponse } from "@/lib/security";
import { d1Query } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface LoginLogRow {
  username: string;
  ip: string;
  user_agent: string;
  country: string | null;
  city: string | null;
  success: number;
  created_at: string;
}

const DEFAULT_LIMIT = 100;

// Lightweight device detection from the User-Agent. We only need a human-readable
// label (e.g. "Oppo Reno 11", "Samsung SM-S928B", "Apple iPhone 15", "Desktop").
// ntfy/telegram already carry the raw UA in `user_agent`; this is just for UX.
export function deviceFromUA(ua: string): string {
  if (!ua) return "Unknown device";
  const u = ua;

  if (/iPad/i.test(u)) return "Apple iPad";

  const iphoneMatch = u.match(/iPhone(?:[ _-]OS[ _]?([\d_]+))?/i);
  if (/iPhone|iPod/i.test(u)) {
    const os = iphoneMatch?.[1]?.replace(/_/g, ".");
    return "Apple iPhone" + (os ? ` ${os}` : "");
  }

  const samsungMatch = u.match(/(SM-[A-Za-z0-9]+)/i);
  if (/Samsung/i.test(u)) return "Samsung" + (samsungMatch?.[1] ? ` ${samsungMatch[1]}` : "");

  if (/OPPO/i.test(u)) {
    const m = u.match(/OPPO[ _-]?([A-Za-z0-9 _-]+)/i);
    const model = m?.[1]?.trim().replace(/\s+/g, " ");
    return "Oppo" + (model ? ` ${model}` : "");
  }
  if (/Xiaomi|Mi[ _][A-Z0-9]/i.test(u)) {
    const m = u.match(/Xiaomi[ _-]?([A-Za-z0-9 _-]+)/i) || u.match(/Mi[ _-]([A-Za-z0-9 _-]+)/i);
    return "Xiaomi" + (m?.[1] ? ` ${m[1].replace(/\s+/g, " ").trim()}` : "");
  }
  if (/Realme/i.test(u)) {
    const m = u.match(/Realme[ _-]?([A-Za-z0-9 _-]+)/i);
    return "Realme" + (m?.[1] ? ` ${m[1].replace(/\s+/g, " ").trim()}` : "");
  }
  if (/Vivo/i.test(u)) {
    const m = u.match(/Vivo[ _-]?([A-Za-z0-9 _-]+)/i);
    return "Vivo" + (m?.[1] ? ` ${m[1].replace(/\s+/g, " ").trim()}` : "");
  }
  if (/OnePlus/i.test(u)) {
    const m = u.match(/OnePlus[ _-]?([A-Za-z0-9 _-]+)/i);
    return "OnePlus" + (m?.[1] ? ` ${m[1].replace(/\s+/g, " ").trim()}` : "");
  }

  if (/Tablet|Android.+Mobile|Android.+touch/i.test(u) && !/Mobile/i.test(u)) return "Tablet";
  return /Mobile|Android|iP(hone|od)/i.test(u) ? "Mobile" : "Desktop";
}

export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return errorResponse("Unauthorized", 401);

  try {
    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || DEFAULT_LIMIT)));

    const rows = await d1Query<LoginLogRow>(
      `SELECT username, ip, user_agent, country, city, success, created_at
       FROM admin_login_logs
       ORDER BY id DESC
       LIMIT ?`,
      [limit]
    );

    const logs = rows.map((r) => ({
      ...r,
      device: deviceFromUA(r.user_agent || ""),
    }));

    return okResponse({ ok: true, logs });
  } catch (err: unknown) {
    // Treat any missing-table / missing-column (i.e. migration 0003 or 0004
    // not applied on prod) as "set up the table" instead of a raw 500. We
    // return 200 + a flag so the dashboard can show the SQL banner (mirrors the
    // analytics pattern) instead of a generic "خطأ في الخادم" server error.
    const msg = err instanceof Error ? err.message : String(err);
    if (/no such table|no such column|has no column|does not exist/i.test(msg)) {
      return okResponse({ ok: true, logs: [], tableMissing: true });
    }
    console.error("[admin/login-logs GET]", err);
    // Surface the real cause to the UI (not a 500, so errorResponse doesn't
    // sanitize it to a generic "خطأ في الخادم").
    return okResponse({ ok: true, logs: [], error: msg });
  }
}
