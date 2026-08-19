-- Migration 0004: login log device + location details.
-- Adds country/city (captured from Cloudflare edge headers cf-ipcountry /
-- cf-ipcity) to admin_login_logs, so the Settings → Login Logs page can show
-- WHERE each login happened. Additive ALTER (safe to run after 0003); existing
-- rows get NULL (displayed as "—" in the UI). Device model is parsed from the
-- User-Agent in the API route (no extra columns needed).

ALTER TABLE admin_login_logs ADD COLUMN country TEXT;
ALTER TABLE admin_login_logs ADD COLUMN city TEXT;
