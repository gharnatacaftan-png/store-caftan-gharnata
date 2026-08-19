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

export async function ensureLoginLogsTable(): Promise<void> {
  try {
    await d1Execute(`
      CREATE TABLE IF NOT EXISTS admin_login_logs (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        username  TEXT    NOT NULL DEFAULT 'admin',
        ip        TEXT,
        user_agent TEXT,
        success    INTEGER NOT NULL DEFAULT 0,
        country    TEXT,
        city       TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await d1Execute(`ALTER TABLE admin_login_logs ADD COLUMN country TEXT;`).catch(() => {});
    await d1Execute(`ALTER TABLE admin_login_logs ADD COLUMN city TEXT;`).catch(() => {});
  } catch (err) {
    dbLogger.warn("ensureLoginLogsTable failed", { reason: String(err) });
  }
}

// Best-effort audit write: a failure here must NEVER break the login/logout
// flow or the admin UI. Auto-creates table if missing.
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
  } catch {
    // If table missing or column missing, auto-create and retry once
    try {
      await ensureLoginLogsTable();
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
    } catch (retryErr) {
      dbLogger.warn("admin_login_logs insert skipped", {
        reason: retryErr instanceof Error ? retryErr.message : String(retryErr),
        ip: entry.ip,
        success: entry.success,
      });
    }
  }
}
