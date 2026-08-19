-- Migration 0002: ntfy.sh notification mirror (optional, opt-in).
-- Adds two columns so order notifications can be mirrored to ntfy.sh IN
-- ADDITION to Telegram. Defaults: OFF (ntfy_enabled = 0, ntfy_topic = '')
-- -> no behaviour change for existing stores until an admin enables it in
-- Settings. Safe, additive ALTER only.

ALTER TABLE site_settings ADD COLUMN ntfy_topic TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN ntfy_enabled INTEGER NOT NULL DEFAULT 0;
