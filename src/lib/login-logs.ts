import "server-only";
import { d1Execute } from "@/lib/db";
import { dbLogger } from "@/lib/logger";

export interface LoginLogEntry {
  username?: string;
  ip: string;
  userAgent: string;
  success: boolean;
  country?: string;
  city?: string;
}

// Best-effort audit write: a failure here must NEVER break the login/logout
// flow or the admin UI. If the admin_login_logs table does not exist yet
// (migration 0003 not applied on this DB) we silently skip — login keeps
// working. This is the ONLY place login events are persisted.
export async function recordLoginLog(entry: LoginLogEntry): Promise<void> {
  try {
    await d1Execute(
      `INSERT INTO admin_login_logs (username, ip, user_agent, success, country, city)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        entry.username ?? "admin",
        entry.ip,
        entry.userAgent ?? "",
        entry.success ? 1 : 0,
        entry.country || null,
        entry.city || null,
      ]
    );
  } catch (err) {
    // Table missing (migration 0003/0004 not applied) / D1 unreachable /
    // permission issue → swallow. auth NEVER degrades because of logging.
    dbLogger.warn("admin_login_logs insert skipped", {
      reason: err instanceof Error ? err.message : String(err),
      ip: entry.ip,
      success: entry.success,
    });
  }
}
