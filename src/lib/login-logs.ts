import "server-only";
import { d1Execute } from "@/lib/db";
import { dbLogger } from "@/lib/logger";

export interface LoginLogEntry {
  username?: string;
  ip: string;
  userAgent: string;
  success: boolean;
}

// Best-effort audit write: a failure here must NEVER break the login/logout
// flow or the admin UI. If the admin_login_logs table does not exist yet
// (migration 0003 not applied on this DB) we silently skip — login keeps
// working. This is the ONLY place login events are persisted.
export async function recordLoginLog(entry: LoginLogEntry): Promise<void> {
  try {
    await d1Execute(
      `INSERT INTO admin_login_logs (username, ip, user_agent, success)
       VALUES (?, ?, ?, ?)`,
      [entry.username ?? "admin", entry.ip, entry.userAgent ?? "", entry.success ? 1 : 0]
    );
  } catch (err) {
    // Table missing / D1 unreachable / permission issue → swallow. auth never degrades.
    dbLogger.warn("admin_login_logs insert skipped", {
      reason: err instanceof Error ? err.message : String(err),
      ip: entry.ip,
      success: entry.success,
    });
  }
}
