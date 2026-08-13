-- ─────────────────────────────────────────────────────────────
-- Migration: téléphones multiples + adresses + instagram en lien
-- - phone3 + drapeaux *_enabled pour les 3 numéros de téléphone
-- - 3 adresses (address1..3) avec drapeaux *_enabled
-- - Instagram passe du nom d'utilisateur au LIEN COMPLET :
--   l'ancienne valeur "username" devient "https://instagram.com/username"
--   et une URL collée dans l'ancien champ est extraite proprement.
-- Sûr à ré-exécuter via scripts/apply-d1-sql.js.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE site_settings ADD COLUMN phone3 TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN phone1_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN phone2_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN phone3_enabled INTEGER NOT NULL DEFAULT 1;

ALTER TABLE site_settings ADD COLUMN address1 TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address2 TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address3 TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address1_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN address2_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN address3_enabled INTEGER NOT NULL DEFAULT 1;

UPDATE site_settings SET instagram = substr(instagram, instr(instagram, 'http')) WHERE instr(instagram, 'http') > 0;
UPDATE site_settings SET instagram = 'https://instagram.com/' || instagram WHERE instagram != '' AND instr(instagram, 'http') = 0;
