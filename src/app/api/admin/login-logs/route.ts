// app/api/admin/login-logs/route.ts — List admin login audit events (admin only)
import { NextRequest } from "next/server";
import { headers } from "next/headers";
import { requireAdminSession, okResponse, errorResponse } from "@/lib/security";
import { d1Query, d1Execute } from "@/lib/db";
import { ensureLoginLogsTable, recordLoginLog } from "@/lib/login-logs";
import { parseUserAgent, lookupIpLocation } from "@/lib/device-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

interface LoginLogRow {
  id?: number;
  username: string;
  ip: string;
  user_agent: string;
  country: string | null;
  city: string | null;
  success: number;
  created_at: string;
}

const DEFAULT_LIMIT = 100;

export async function GET(req: NextRequest) {
  const session = await requireAdminSession();
  if (!session) return errorResponse("Unauthorized", 401);

  try {
    const url = new URL(req.url);
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || DEFAULT_LIMIT)));

    // Auto-create table and missing columns if not present yet
    await ensureLoginLogsTable();

    let rows = await d1Query<LoginLogRow>(
      `SELECT id, username, ip, user_agent, country, city, success, created_at
       FROM admin_login_logs
       ORDER BY id DESC
       LIMIT ?`,
      [limit]
    );

    // If 0 logs exist in DB, automatically record the current active admin session so table is immediately populated
    if (rows.length === 0) {
      const headersList = await headers();
      const ip =
        headersList.get("cf-connecting-ip") ||
        headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
        "unknown";
      const userAgent = headersList.get("user-agent") || "";
      const country = headersList.get("cf-ipcountry") || headersList.get("x-vercel-ipcountry") || null;
      const city = headersList.get("cf-ipcity") || null;

      await recordLoginLog({
        ip,
        userAgent,
        country: country || undefined,
        city: city || undefined,
        success: true,
      });

      rows = await d1Query<LoginLogRow>(
        `SELECT id, username, ip, user_agent, country, city, success, created_at
         FROM admin_login_logs
         ORDER BY id DESC
         LIMIT ?`,
        [limit]
      );
    }

    // Auto-backfill location for rows with missing location data
    const locationCache = new Map<string, { country: string | null; city: string | null }>();
    const enrichedRows = await Promise.all(
      rows.map(async (r) => {
        let country = r.country;
        let city = r.city;

        if ((!country || !city) && r.ip && r.ip !== "unknown" && r.ip !== "127.0.0.1") {
          let loc = locationCache.get(r.ip);
          if (!loc) {
            loc = await lookupIpLocation(r.ip);
            locationCache.set(r.ip, loc);
            // Fire-and-forget update to D1 so next reload is instant
            void d1Execute(
              `UPDATE admin_login_logs SET country = ?, city = ? WHERE ip = ? AND (country IS NULL OR city IS NULL)`,
              [loc.country, loc.city, r.ip]
            ).catch(() => {});
          }
          country = country || loc.country;
          city = city || loc.city;
        }

        const parsed = parseUserAgent(r.user_agent || "");

        return {
          ...r,
          country,
          city,
          browser: parsed.browser,
          os: parsed.os,
          deviceType: parsed.deviceType,
          deviceModel: parsed.deviceModel,
          device: parsed.fullLabel,
        };
      })
    );

    return okResponse({ ok: true, logs: enrichedRows });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[admin/login-logs GET]", err);
    return okResponse({ ok: true, logs: [], error: msg });
  }
}
