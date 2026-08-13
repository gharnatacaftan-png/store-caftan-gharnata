-- ─────────────────────────────────────────────────────────────
-- Migration: réseaux sociaux + localisation dans site_settings
-- Réseaux (facebook/tiktok/x_link) et localisation stockés en URL
-- complètes; Instagram garde son nom d'utilisateur historique.
-- Chaque réseau a un drapeau *_enabled (1 = affiché dans le footer
-- et sur les bons de commande/livraison, 0 = masqué).
-- Sûr à ré-exécuter via scripts/apply-d1-sql.js (ignore
-- "duplicate column").
-- ─────────────────────────────────────────────────────────────

ALTER TABLE site_settings ADD COLUMN facebook TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN tiktok TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN x_link TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN location_url TEXT NOT NULL DEFAULT '';

ALTER TABLE site_settings ADD COLUMN instagram_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN facebook_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN tiktok_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN x_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN location_enabled INTEGER NOT NULL DEFAULT 1;
