-- ─────────────────────────────────────────────────────────────
-- Migration: optional ntfy.sh notification mirror in site_settings
-- Adds `ntfy_topic` (TEXT) and `ntfy_enabled` (INTEGER) so order
-- notifications can be mirrored to ntfy.sh IN ADDITION to Telegram.
--
-- Default OFF (ntfy_enabled = 0): nothing is sent to ntfy until an admin
-- enables it and sets a topic in Settings → ntfy.sh. Safe to re-run
-- (apply-d1-sql.js ignores "duplicate column" errors).
-- ─────────────────────────────────────────────────────────────

ALTER TABLE site_settings ADD COLUMN ntfy_topic   TEXT    NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN ntfy_enabled INTEGER NOT NULL DEFAULT 0;
