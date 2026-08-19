-- Migration 0003: Admin login audit trail.
-- Records every admin login attempt (success + failure) with IP, user-agent
-- and timestamp so the Settings → "login-logs" page can show WHO entered WHEN.
--
-- Additive only: a brand-new table. Existing databases are unaffected (no
-- existing table altered). Safe to re-run? wrangler migrations are tracked, so
-- this runs once per database. The table is created IF NOT EXISTS as a safety
-- net for any DB that already has it via schema.sql.

CREATE TABLE IF NOT EXISTS admin_login_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  username    TEXT    NOT NULL DEFAULT 'admin',
  ip          TEXT,
  user_agent  TEXT,
  success     INTEGER NOT NULL DEFAULT 0,
  created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_created ON admin_login_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_success ON admin_login_logs (success);
