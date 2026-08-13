-- Initial Cloudflare D1 schema for caftan-gharnata.
--
-- WARNING: this file was historically out of sync with the app. The canonical
-- schema is schema.sql (executed locally via scripts/init-db.js). This migration
-- mirrors the FINAL schema (all columns already applied, no ALTERs) so it is
-- safe both on a fresh database and on one already created via init-db.js:
-- CREATE TABLE IF NOT EXISTS / INSERT OR IGNORE make it idempotent.

-- 1. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  slug      TEXT NOT NULL UNIQUE,
  name_ar   TEXT NOT NULL,
  image_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

INSERT OR IGNORE INTO categories (name, slug, name_ar) VALUES
  ('Caftans',          'caftans',          'القفطان'),
  ('Robes kabyles',    'robes-kabyles',     'جبب قبايل'),
  ('Blouza oranaise',  'blouza-oranaise',   'البلوزة الوهرانية'),
  ('Karakou',          'karakou',           'الكراكو'),
  ('Robes d''hôtesse', 'robes-d-hotesse',   'روب الاستقبال');

-- 2. SHIPPING RATES (58 wilayas; official tariffs. Full multilingual seed lives
-- in cloudflare/seed_shipping.sql and scripts/migrate-shipping-rates.sql.)
CREATE TABLE IF NOT EXISTS shipping_rates (
  wilaya_code   INTEGER PRIMARY KEY,
  wilaya_name   TEXT    NOT NULL,
  name_fr       TEXT,
  name_en       TEXT,
  price_home    INTEGER NOT NULL DEFAULT 700,
  price_desk    INTEGER NOT NULL DEFAULT 500,
  is_deliverable INTEGER DEFAULT 1
);

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id      INTEGER NOT NULL,
  title            TEXT    NOT NULL,
  title_fr         TEXT    DEFAULT '',
  title_en         TEXT    DEFAULT '',
  description      TEXT,
  description_fr   TEXT    DEFAULT '',
  description_en   TEXT    DEFAULT '',
  price            INTEGER NOT NULL,
  sizes            TEXT    DEFAULT '["S","M","L","XL","XXL"]',
  colors           TEXT    DEFAULT '[]',
  color_media_map  TEXT    DEFAULT '{}',
  is_active        INTEGER DEFAULT 1,
  is_featured      INTEGER DEFAULT 0,
  total_media_bytes INTEGER DEFAULT 0,
  created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- 4. PRODUCT MEDIA (linked to R2)
CREATE TABLE IF NOT EXISTS product_media (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id       INTEGER NOT NULL,
  r2_key           TEXT    NOT NULL,
  r2_url           TEXT    NOT NULL,
  file_type        TEXT    CHECK(file_type IN ('IMAGE','VIDEO')) NOT NULL,
  file_size_bytes  INTEGER NOT NULL DEFAULT 0,
  is_primary       INTEGER DEFAULT 0,
  sort_order       INTEGER DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 5. ORDERS (COD)
CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name   TEXT    NOT NULL,
  customer_phone  TEXT    NOT NULL,
  wilaya_code     INTEGER NOT NULL,
  commune         TEXT    NOT NULL,
  shipping_type   TEXT    CHECK(shipping_type IN ('HOME','DESK')) NOT NULL,
  product_id      INTEGER NOT NULL,
  selected_size   TEXT,
  selected_color  TEXT,
  product_price   INTEGER NOT NULL,
  shipping_cost   INTEGER NOT NULL,
  total_price     INTEGER NOT NULL,
  status          TEXT    CHECK(status IN ('PENDING','CONFIRMED','SHIPPED','DELIVERED','CANCELLED')) DEFAULT 'PENDING',
  lang            TEXT    DEFAULT 'ar',
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wilaya_code) REFERENCES shipping_rates(wilaya_code),
  FOREIGN KEY (product_id)  REFERENCES products(id)
);

-- 5bis. ORDER ITEMS
CREATE TABLE IF NOT EXISTS order_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id       INTEGER NOT NULL,
  product_id     INTEGER NOT NULL,
  title          TEXT,
  selected_size  TEXT,
  selected_color TEXT,
  quantity       INTEGER NOT NULL DEFAULT 1,
  unit_price     INTEGER NOT NULL,
  FOREIGN KEY (order_id)  REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 6. ADMIN USERS
CREATE TABLE IF NOT EXISTS admin_users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 7. SITE SETTINGS (final shape, includes socials, phones, addresses, telegram)
CREATE TABLE IF NOT EXISTS site_settings (
  id                 TEXT PRIMARY KEY CHECK (id = 'store'),
  phone1             TEXT NOT NULL,
  phone2             TEXT NOT NULL DEFAULT '',
  phone3             TEXT NOT NULL DEFAULT '',
  whatsapp           TEXT NOT NULL,
  instagram          TEXT NOT NULL,
  hero_image         TEXT,
  facebook           TEXT NOT NULL DEFAULT '',
  tiktok             TEXT NOT NULL DEFAULT '',
  x_link             TEXT NOT NULL DEFAULT '',
  location_url       TEXT NOT NULL DEFAULT '',
  instagram_enabled  INTEGER NOT NULL DEFAULT 1,
  facebook_enabled   INTEGER NOT NULL DEFAULT 1,
  tiktok_enabled     INTEGER NOT NULL DEFAULT 1,
  x_enabled          INTEGER NOT NULL DEFAULT 1,
  location_enabled   INTEGER NOT NULL DEFAULT 1,
  phone1_enabled     INTEGER NOT NULL DEFAULT 1,
  phone2_enabled     INTEGER NOT NULL DEFAULT 1,
  phone3_enabled     INTEGER NOT NULL DEFAULT 1,
  address1           TEXT NOT NULL DEFAULT '',
  address1_url       TEXT NOT NULL DEFAULT '',
  address2           TEXT NOT NULL DEFAULT '',
  address2_url       TEXT NOT NULL DEFAULT '',
  address3           TEXT NOT NULL DEFAULT '',
  address3_url       TEXT NOT NULL DEFAULT '',
  address4           TEXT NOT NULL DEFAULT '',
  address4_url       TEXT NOT NULL DEFAULT '',
  address1_enabled   INTEGER NOT NULL DEFAULT 1,
  address2_enabled   INTEGER NOT NULL DEFAULT 1,
  address3_enabled   INTEGER NOT NULL DEFAULT 1,
  address4_enabled   INTEGER NOT NULL DEFAULT 1,
  telegram_bot_token TEXT NOT NULL DEFAULT '',
  telegram_chat_id   TEXT NOT NULL DEFAULT '',
  telegram_enabled   INTEGER NOT NULL DEFAULT 1,
  updated_at         DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_settings (id, phone1, phone2, whatsapp, instagram)
VALUES ('store', '0561234567', '0671234567', '213561234567', 'https://instagram.com/caftan_granada');

-- 8. SITE VISITS (anonymous analytics)
CREATE TABLE IF NOT EXISTS site_visits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  page_path    TEXT    NOT NULL,
  visitor_hash TEXT,
  device_type  TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_visits_created ON site_visits (created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_page ON site_visits (page_path);
