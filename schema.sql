-- ============================================================
-- Caftan Gharnata — Cloudflare D1 Schema
-- ============================================================

-- 1. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  name      TEXT NOT NULL,
  slug      TEXT NOT NULL UNIQUE,
  name_ar   TEXT NOT NULL,
  image_url TEXT,                 -- full R2 public URL; NULL = bundled default image
  is_active INTEGER NOT NULL DEFAULT 1  -- 1 = visible on storefront, 0 = hidden
);

INSERT OR IGNORE INTO categories (name, slug, name_ar) VALUES
  ('Caftans',          'caftans',          'القفطان'),
  ('Robes kabyles',    'robes-kabyles',     'جبب قبايل'),
  ('Blouza oranaise',  'blouza-oranaise',   'البلوزة الوهرانية'),
  ('Karakou',          'karakou',           'الكراكو'),
  ('Robes d''hôtesse', 'robes-d-hotesse',   'روب الاستقبال');

-- Migration: add category image column if missing (safe to re-run; init-db.js
-- tolerates the "duplicate column" error for existing databases)
ALTER TABLE categories ADD COLUMN image_url TEXT;

-- Migration: add category visibility flag if missing (safe to re-run)
ALTER TABLE categories ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;

-- 2. SHIPPING RATES (58 wilayas)
-- Tarifs officiels + noms trilingues (ar/fr/en).
-- La migration scripts/migrate-shipping-rates.sql fait foi pour la base de
-- production ; ce seed doit rester synchronisé avec elle.
CREATE TABLE IF NOT EXISTS shipping_rates (
  wilaya_code   INTEGER PRIMARY KEY,
  wilaya_name   TEXT    NOT NULL,
  name_fr       TEXT,
  name_en       TEXT,
  price_home    INTEGER NOT NULL DEFAULT 700,
  price_desk    INTEGER NOT NULL DEFAULT 500,
  is_deliverable BOOLEAN DEFAULT TRUE
);

-- Migration: add multilingual name columns if missing (safe to re-run)
ALTER TABLE shipping_rates ADD COLUMN name_fr TEXT;
ALTER TABLE shipping_rates ADD COLUMN name_en TEXT;

INSERT OR IGNORE INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk) VALUES
  (1,  'أدرار',           'Adrar',              'Adrar',               1600, 1500),
  (2,  'الشلف',           'Chlef',              'Chlef',               650, 550),
  (3,  'الأغواط',         'Laghouat',           'Laghouat',            800, 650),
  (4,  'أم البواقي',      'Oum El Bouaghi',     'Oum El Bouaghi',      650, 550),
  (5,  'باتنة',           'Batna',              'Batna',               650, 550),
  (6,  'بجاية',           'Béjaïa',             'Bejaia',              650, 550),
  (7,  'بسكرة',           'Biskra',             'Biskra',              800, 650),
  (8,  'بشار',            'Béchar',             'Bechar',              1600, 1500),
  (9,  'البليدة',         'Blida',              'Blida',               500, 400),
  (10, 'البويرة',         'Bouira',             'Bouira',              650, 550),
  (11, 'تمنراست',         'Tamanrasset',        'Tamanrasset',         1600, 1500),
  (12, 'تبسة',            'Tébessa',            'Tebessa',             800, 650),
  (13, 'تلمسان',          'Tlemcen',            'Tlemcen',             650, 550),
  (14, 'تيارت',           'Tiaret',             'Tiaret',              650, 550),
  (15, 'تيزي وزو',        'Tizi Ouzou',         'Tizi Ouzou',          650, 550),
  (16, 'الجزائر',         'Alger',              'Algiers',             450, 350),
  (17, 'الجلفة',          'Djelfa',             'Djelfa',              800, 650),
  (18, 'جيجل',            'Jijel',              'Jijel',               650, 550),
  (19, 'سطيف',            'Sétif',              'Setif',               650, 550),
  (20, 'سعيدة',           'Saïda',              'Saida',               650, 550),
  (21, 'سكيكدة',          'Skikda',             'Skikda',              650, 550),
  (22, 'سيدي بلعباس',     'Sidi Bel Abbès',     'Sidi Bel Abbes',      650, 550),
  (23, 'عنابة',           'Annaba',             'Annaba',              650, 550),
  (24, 'قالمة',           'Guelma',             'Guelma',              650, 550),
  (25, 'قسنطينة',         'Constantine',        'Constantine',         650, 550),
  (26, 'المدية',          'Médéa',              'Medea',               650, 550),
  (27, 'مستغانم',         'Mostaganem',         'Mostaganem',          650, 550),
  (28, 'المسيلة',         'M''Sila',            'M''Sila',             650, 550),
  (29, 'معسكر',           'Mascara',            'Mascara',             650, 550),
  (30, 'ورقلة',           'Ouargla',            'Ouargla',             800, 650),
  (31, 'وهران',           'Oran',               'Oran',                650, 550),
  (32, 'البيض',           'El Bayadh',          'El Bayadh',           1600, 1500),
  (33, 'إليزي',           'Illizi',             'Illizi',              1600, 1500),
  (34, 'برج بوعريريج',    'Bordj Bou Arréridj', 'Bordj Bou Arreridj',  650, 550),
  (35, 'بومرداس',         'Boumerdès',          'Boumerdes',           500, 400),
  (36, 'الطارف',          'El Tarf',            'El Tarf',             650, 550),
  (37, 'تندوف',           'Tindouf',            'Tindouf',             1600, 1500),
  (38, 'تيسمسيلت',        'Tissemsilt',         'Tissemsilt',          650, 550),
  (39, 'الوادي',          'El Oued',            'El Oued',             800, 650),
  (40, 'خنشلة',           'Khenchela',          'Khenchela',           650, 550),
  (41, 'سوق أهراس',       'Souk Ahras',         'Souk Ahras',          650, 550),
  (42, 'تيبازة',          'Tipaza',             'Tipaza',              500, 400),
  (43, 'ميلة',            'Mila',               'Mila',                650, 550),
  (44, 'عين الدفلى',      'Aïn Defla',          'Ain Defla',           650, 550),
  (45, 'النعامة',         'Naâma',              'Naama',               1600, 1500),
  (46, 'عين تموشنت',      'Aïn Témouchent',     'Ain Temouchent',      650, 550),
  (47, 'غرداية',          'Ghardaïa',           'Ghardaia',            800, 650),
  (48, 'غليزان',          'Relizane',           'Relizane',            650, 550),
  (49, 'المغير',          'El M''Ghair',        'El M''Ghair',         800, 650),
  (50, 'المنيعة',         'El Meniaa',          'El Menia',            800, 650),
  (51, 'أولاد جلال',      'Ouled Djellal',      'Ouled Djellal',       800, 650),
  (52, 'برج باجي مختار',  'Bordj Badji Mokhtar','Bordj Badji Mokhtar', 1600, 1500),
  (53, 'بني عباس',        'Béni Abbès',         'Beni Abbes',          1600, 1500),
  (54, 'تيميمون',         'Timimoun',           'Timimoun',            1600, 1500),
  (55, 'تقرت',            'Touggourt',          'Touggourt',           800, 650),
  (56, 'جانت',            'Djanet',             'Djanet',              1600, 1500),
  (57, 'عين صالح',        'In Salah',           'In Salah',            1600, 1500),
  (58, 'عين قزام',        'In Guezzam',         'In Guezzam',          1600, 1500);

-- 3. PRODUCTS
CREATE TABLE IF NOT EXISTS products (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id        INTEGER NOT NULL,
  title              TEXT    NOT NULL,
  title_fr           TEXT    DEFAULT '',
  title_en           TEXT    DEFAULT '',
  description        TEXT,
  description_fr     TEXT    DEFAULT '',
  description_en     TEXT    DEFAULT '',
  price              INTEGER NOT NULL,
  sizes              TEXT    DEFAULT '["S","M","L","XL","XXL"]',
  colors             TEXT    DEFAULT '[]',
  is_active          BOOLEAN DEFAULT TRUE,
  is_featured        BOOLEAN DEFAULT FALSE,
  total_media_bytes  INTEGER DEFAULT 0,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Migration: add multilingual columns if missing (safe to re-run)
ALTER TABLE products ADD COLUMN title_fr       TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN title_en       TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN description_fr TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN description_en TEXT DEFAULT '';

-- Migration: color→media mapping, used by products-db.ts (safe to re-run)
ALTER TABLE products ADD COLUMN color_media_map TEXT DEFAULT '{}';

-- 4. PRODUCT MEDIA (linked to R2)
CREATE TABLE IF NOT EXISTS product_media (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id       INTEGER NOT NULL,
  r2_key           TEXT    NOT NULL,        -- R2 object key (path)
  r2_url           TEXT    NOT NULL,        -- Public URL
  file_type        TEXT    CHECK(file_type IN ('IMAGE','VIDEO')) NOT NULL,
  file_size_bytes  INTEGER NOT NULL DEFAULT 0,
  is_primary       BOOLEAN DEFAULT FALSE,
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
  lang            TEXT    DEFAULT 'ar',          -- language the customer used when ordering (ar/fr/en)
  notes           TEXT,
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wilaya_code) REFERENCES shipping_rates(wilaya_code),
  FOREIGN KEY (product_id)  REFERENCES products(id)
);

-- Migration: add the customer's language column if missing (safe to re-run;
-- init-db.js tolerates the "duplicate column" error for existing databases)
ALTER TABLE orders ADD COLUMN lang TEXT DEFAULT 'ar';

-- 5bis. ORDER ITEMS — one row per product line in an order (multi-item cart).
-- Legacy single-product orders have no rows here; their line is reconstructed
-- from the orders header columns (product_id, selected_size, selected_color,
-- product_price = line subtotal).
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

-- 7. SITE SETTINGS (store phone / WhatsApp / Instagram / hero image — D1 source of truth)
CREATE TABLE IF NOT EXISTS site_settings (
  id         TEXT PRIMARY KEY CHECK (id = 'store'),
  phone1     TEXT NOT NULL,
  phone2     TEXT NOT NULL DEFAULT '',
  phone3     TEXT NOT NULL DEFAULT '',
  whatsapp   TEXT NOT NULL,
  instagram  TEXT NOT NULL,          -- full URL (e.g. https://instagram.com/...)
  hero_image TEXT,                  -- full R2 public URL; NULL = bundled default hero
  facebook   TEXT NOT NULL DEFAULT '',
  tiktok     TEXT NOT NULL DEFAULT '',
  x_link     TEXT NOT NULL DEFAULT '',
  location_url      TEXT NOT NULL DEFAULT '',
  instagram_enabled INTEGER NOT NULL DEFAULT 1,
  facebook_enabled  INTEGER NOT NULL DEFAULT 1,
  tiktok_enabled    INTEGER NOT NULL DEFAULT 1,
  x_enabled         INTEGER NOT NULL DEFAULT 1,
  location_enabled  INTEGER NOT NULL DEFAULT 1,
  phone1_enabled    INTEGER NOT NULL DEFAULT 1,
  phone2_enabled    INTEGER NOT NULL DEFAULT 1,
  phone3_enabled    INTEGER NOT NULL DEFAULT 1,
  address1   TEXT NOT NULL DEFAULT '',
  address1_url      TEXT NOT NULL DEFAULT '',  -- Google Maps link of address1
  address2   TEXT NOT NULL DEFAULT '',
  address2_url      TEXT NOT NULL DEFAULT '',
  address3   TEXT NOT NULL DEFAULT '',
  address3_url      TEXT NOT NULL DEFAULT '',
  address4   TEXT NOT NULL DEFAULT '',
  address4_url      TEXT NOT NULL DEFAULT '',
  address1_enabled  INTEGER NOT NULL DEFAULT 1,
  address2_enabled  INTEGER NOT NULL DEFAULT 1,
  address3_enabled  INTEGER NOT NULL DEFAULT 1,
  address4_enabled  INTEGER NOT NULL DEFAULT 1,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO site_settings (id, phone1, phone2, whatsapp, instagram)
VALUES ('store', '0561234567', '0671234567', '213561234567', 'https://instagram.com/caftan_granada');

-- Migration: add the hero image column if missing (safe to re-run)
ALTER TABLE site_settings ADD COLUMN hero_image TEXT;

-- Migration: social networks + location (safe to re-run via scripts/apply-d1-sql.js)
ALTER TABLE site_settings ADD COLUMN facebook TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN tiktok TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN x_link TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN location_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN instagram_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN facebook_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN tiktok_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN x_enabled INTEGER NOT NULL DEFAULT 1;
ALTER TABLE site_settings ADD COLUMN location_enabled INTEGER NOT NULL DEFAULT 1;

-- Migration: phones (x3) + addresses (x3) + instagram as full link (safe to re-run via scripts/apply-d1-sql.js)
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

-- Migration: per-address map links + 4th address (safe to re-run via scripts/apply-d1-sql.js)
ALTER TABLE site_settings ADD COLUMN address1_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address2_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address3_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address4 TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address4_url TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN address4_enabled INTEGER NOT NULL DEFAULT 1;

-- Telegram order notifications
ALTER TABLE site_settings ADD COLUMN telegram_bot_token TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN telegram_chat_id TEXT NOT NULL DEFAULT '';
ALTER TABLE site_settings ADD COLUMN telegram_enabled INTEGER NOT NULL DEFAULT 1;
UPDATE site_settings SET address1_url = location_url WHERE address1_url = '' AND location_url != '';

-- 8. SITE VISITS (anonymous visit analytics)
CREATE TABLE IF NOT EXISTS site_visits (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  page_path    TEXT    NOT NULL,
  visitor_hash TEXT,
  device_type  TEXT,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_site_visits_created ON site_visits (created_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_page ON site_visits (page_path);
