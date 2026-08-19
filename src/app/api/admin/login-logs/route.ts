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

    const rows = await d1Query<LoginLogRow>(
      `SELECT username, ip, user_agent, success, created_at
       FROM admin_login_logs
       ORDER BY id DESC
       LIMIT ?`,
      [limit]
    );

    return okResponse({ ok: true, logs: rows });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const tableMissing = msg.includes("no such table");
    if (tableMissing) {
      // Migration 0003 not applied yet — return empty so the UI can show the
      // SQL setup banner (mirrors the analytics "table missing" pattern).
      return okResponse({ ok: true, logs: [], tableMissing: true });
    }
    console.error("[admin/login-logs GET]", err);
    return errorResponse("Failed to load login logs", 500);
  }
}
