-- ─────────────────────────────────────────────────────────────
-- Migration: chaque adresse a son propre lien de carte (map).
-- - address1_url..address3_url : lien Google Maps de chaque adresse
-- - address4 (+ url + drapeau) : 4ème adresse ajoutable
-- - l'ancien lien de localisation global (location_url) est rattaché
--   à l'adresse 1 pour ne rien perdre.
-- Sûr à ré-exécuter via scripts/apply-d1-sql.js.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE site_settings ADD COLUMN address1_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address2_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address3_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address4 TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address4_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address4_enabled INTEGER NOT NULL DEFAULT 1;

UPDATE site_settings SET address1_url = location_url WHERE address1_url = '' AND location_url != '';
