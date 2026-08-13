-- Incremental migration: add the products.color_media_map column.
-- Run via:  node scripts/apply-d1-sql.js cloudflare/add_color_media_map.sql
-- Safe to re-run (the runner ignores "duplicate column" errors).
ALTER TABLE products ADD COLUMN color_media_map TEXT DEFAULT '{}';