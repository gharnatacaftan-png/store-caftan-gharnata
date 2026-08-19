import "server-only";
import fs from "fs";
import path from "path";
import { d1Query, d1QueryFirst, d1Execute } from "./db";

export interface SiteSettings {
  phone1: string;
  phone2: string;
  phone3: string;
  whatsapp: string;
  instagram: string;
  hero_image: string | null; // full URL or null → bundled default hero
  // Social networks + location — each has a visibility flag controlling the
  // storefront footer and the printed order/delivery slips. All of them
  // (Instagram included) store full URLs.
  facebook: string;
  tiktok: string;
  x_link: string;
  location_url: string;
  instagram_enabled: boolean;
  facebook_enabled: boolean;
  tiktok_enabled: boolean;
  x_enabled: boolean;
  location_enabled: boolean;
  // Phones (up to 3) and store addresses (up to 4), each with a visibility
  // flag, shown in the footer and on the printed slips. Every address carries
  // its own map link (addressN_url).
  phone1_enabled: boolean;
  phone2_enabled: boolean;
  phone3_enabled: boolean;
  address1: string;
  address1_url: string;
  address2: string;
  address2_url: string;
  address3: string;
  address3_url: string;
  address4: string;
  address4_url: string;
  address4_enabled: boolean;
  address1_enabled: boolean;
  address2_enabled: boolean;
  address3_enabled: boolean;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  telegram_enabled?: boolean;
  // ntfy.sh mirror notifications (optional, opt-in). Stored only when the
  // `ntfy_topic`/`ntfy_enabled` columns exist on the DB (OPTIONAL_COLS safety).
  ntfy_topic?: string;
  ntfy_enabled?: boolean;
}

const DEFAULT_SETTINGS: SiteSettings = {
  phone1: "0561234567",
  phone2: "0671234567",
  phone3: "",
  whatsapp: "213561234567",
  instagram: "https://instagram.com/caftan_granada",
  hero_image: null,
  facebook: "",
  tiktok: "",
  x_link: "",
  location_url: "",
  instagram_enabled: true,
  facebook_enabled: true,
  tiktok_enabled: true,
  x_enabled: true,
  location_enabled: true,
  phone1_enabled: true,
  phone2_enabled: true,
  phone3_enabled: true,
  address1: "",
  address1_url: "",
  address2: "",
  address2_url: "",
  address3: "",
  address3_url: "",
  address4: "",
  address4_url: "",
  address4_enabled: true,
  address1_enabled: true,
  address2_enabled: true,
address3_enabled: true,
  telegram_bot_token: "",
  telegram_chat_id: "",
  telegram_enabled: true,
  ntfy_topic: "",
  ntfy_enabled: false,
};

// Optional columns added by the social/contact migrations. Detected once via
// PRAGMA so reads/writes stay valid on databases where the migration has not
// been applied yet (dev without D1 access, older deployments).
const OPTIONAL_STRING_COLS = [
  "facebook", "tiktok", "x_link", "location_url",
  "phone3",
  "address1", "address1_url", "address2", "address2_url", "address3", "address3_url",
  "address4", "address4_url",
  "telegram_bot_token", "telegram_chat_id",
  "ntfy_topic",
] as const;
const OPTIONAL_BOOL_COLS = [
  "instagram_enabled", "facebook_enabled", "tiktok_enabled", "x_enabled", "location_enabled",
  "phone1_enabled", "phone2_enabled", "phone3_enabled",
  "address1_enabled", "address2_enabled", "address3_enabled", "address4_enabled",
  "telegram_enabled",
  "ntfy_enabled",
] as const;
const OPTIONAL_COLS = [...OPTIONAL_STRING_COLS, ...OPTIONAL_BOOL_COLS] as const;

let optionalColsCache: Set<string> | null = null;

async function getAvailableCols(): Promise<Set<string>> {
  if (optionalColsCache) return optionalColsCache;
  try {
    const rows = await d1Query<{ name: string }>(`PRAGMA table_info(site_settings)`);
    const names = new Set(rows.map(r => r.name));
    optionalColsCache = new Set(OPTIONAL_COLS.filter(c => names.has(c)));
  } catch {
    optionalColsCache = new Set(); // D1 unreachable → caller falls back to JSON
  }
  return optionalColsCache;
}

function toBool(v: unknown): boolean {
  return v === 1 || v === "1" || v === true;
}

function applyOptional(settings: SiteSettings, row: Record<string, unknown>, cols: Set<string>): SiteSettings {
  const next = { ...settings };
  for (const c of OPTIONAL_STRING_COLS) if (cols.has(c)) next[c] = String(row[c] ?? "");
  for (const c of OPTIONAL_BOOL_COLS) if (cols.has(c)) next[c] = toBool(row[c]);
  return next;
}

// D1-backed store settings (single source of truth, persistent on Cloudflare).
// The old JSON-file implementation did not persist on the serverless edge.
// Falls back to the local JSON file only when D1 is unreachable (e.g. a dev
// environment without the Cloudflare env vars) so nothing breaks offline.

const DATA_PATH = path.join(process.cwd(), "data", "settings.json");

function getJsonSettings(): SiteSettings {
  try {
    if (!fs.existsSync(DATA_PATH)) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(fs.readFileSync(DATA_PATH, "utf-8")) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function writeJsonSettings(settings: SiteSettings): void {
  try {
    const dir = path.dirname(DATA_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_PATH, JSON.stringify(settings, null, 2));
  } catch {
    // Non-fatal — D1 is the source of truth.
  }
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const cols = await getAvailableCols();
    const optionalSelect = [...cols].join(", ");
    const row = await d1QueryFirst<Record<string, unknown>>(
      `SELECT phone1, phone2, whatsapp, instagram, hero_image${optionalSelect ? ", " + optionalSelect : ""}
       FROM site_settings WHERE id = 'store'`
    );
    if (row) {
      return applyOptional({ ...DEFAULT_SETTINGS, ...row, hero_image: (row.hero_image as string | null) ?? null }, row, cols);
    }
    // Table exists but empty (fresh D1) — seed the defaults once.
    await d1Execute(
      `INSERT OR IGNORE INTO site_settings (id, phone1, phone2, whatsapp, instagram, hero_image)
       VALUES ('store', ?, ?, ?, ?, NULL)`,
      [DEFAULT_SETTINGS.phone1, DEFAULT_SETTINGS.phone2, DEFAULT_SETTINGS.whatsapp, DEFAULT_SETTINGS.instagram]
    );
    return { ...DEFAULT_SETTINGS };
  } catch {
    // D1 unavailable (missing env, offline, table not created yet) → JSON fallback.
    return getJsonSettings();
  }
}

export async function updateSiteSettings(settings: SiteSettings): Promise<SiteSettings> {
  const cleanSettings: SiteSettings = {
    phone1: settings.phone1.trim(),
    phone2: settings.phone2.trim(),
    phone3: settings.phone3.trim(),
    whatsapp: settings.whatsapp.trim(),
    instagram: settings.instagram.trim(),
    hero_image: settings.hero_image ?? null,
    facebook: settings.facebook.trim(),
    tiktok: settings.tiktok.trim(),
    x_link: settings.x_link.trim(),
    location_url: settings.location_url.trim(),
    instagram_enabled: settings.instagram_enabled,
    facebook_enabled: settings.facebook_enabled,
    tiktok_enabled: settings.tiktok_enabled,
    x_enabled: settings.x_enabled,
    location_enabled: settings.location_enabled,
    phone1_enabled: settings.phone1_enabled,
    phone2_enabled: settings.phone2_enabled,
    phone3_enabled: settings.phone3_enabled,
    address1: settings.address1.trim(),
    address1_url: settings.address1_url.trim(),
    address2: settings.address2.trim(),
    address2_url: settings.address2_url.trim(),
    address3: settings.address3.trim(),
    address3_url: settings.address3_url.trim(),
    address4: settings.address4.trim(),
    address4_url: settings.address4_url.trim(),
    address4_enabled: settings.address4_enabled,
    address1_enabled: settings.address1_enabled,
    address2_enabled: settings.address2_enabled,
    address3_enabled: settings.address3_enabled,
    telegram_bot_token: (settings.telegram_bot_token ?? "").trim(),
    telegram_chat_id: (settings.telegram_chat_id ?? "").trim(),
    telegram_enabled: Boolean(settings.telegram_enabled),
    ntfy_topic: (settings.ntfy_topic ?? "").trim(),
    ntfy_enabled: Boolean(settings.ntfy_enabled),
  };

  try {
    const cols = await getAvailableCols();
    // Only write the optional columns that exist on this database, so the
    // save keeps working before the social-settings migration is applied.
    const optionalSets = [...cols]
      .map(c => `${c} = excluded.${c}`)
      .join(", ");
    await d1Execute(
      `INSERT INTO site_settings (id, phone1, phone2, whatsapp, instagram, ${[...cols].join(", ") ? [...cols].join(", ") + "," : ""} updated_at)
       VALUES ('store', ?, ?, ?, ?, ${[...cols].map(() => "?").join(", ") ? [...cols].map(() => "?").join(", ") + "," : ""} CURRENT_TIMESTAMP)
       ON CONFLICT(id) DO UPDATE SET
         phone1 = excluded.phone1,
         phone2 = excluded.phone2,
         whatsapp = excluded.whatsapp,
         instagram = excluded.instagram${optionalSets ? ",\n         " + optionalSets : ""},
         updated_at = CURRENT_TIMESTAMP`,
      [
        cleanSettings.phone1,
        cleanSettings.phone2,
        cleanSettings.whatsapp,
        cleanSettings.instagram,
        ...[...cols].map(c => {
          const v = cleanSettings[c as keyof SiteSettings];
          return typeof v === "boolean" ? (v ? 1 : 0) : String(v ?? "");
        }),
      ]
    );
  } catch {
    // D1 unavailable → mirror into the local JSON file so dev still works.
    writeJsonSettings(cleanSettings);
  }

  return cleanSettings;
}

// Set or clear the hero image. Passing null restores the bundled default.
export async function setHeroImage(imageUrl: string | null): Promise<void> {
  try {
    // NOTE: the row already exists (id='store'), but several columns are
    // NOT NULL (phone1, phone2, whatsapp, instagram), so an INSERT cannot
    // omit them. Use a plain UPDATE when the row is present, and only fall
    // back to an INSERT (with the default values) if it somehow went missing.
    const updated = await d1Execute(
      `UPDATE site_settings SET hero_image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 'store'`,
      [imageUrl]
    );
    if (updated.changes === 0) {
      await d1Execute(
        `INSERT INTO site_settings (id, phone1, phone2, whatsapp, instagram, hero_image, updated_at)
         VALUES ('store', ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [DEFAULT_SETTINGS.phone1, DEFAULT_SETTINGS.phone2, DEFAULT_SETTINGS.whatsapp, DEFAULT_SETTINGS.instagram, imageUrl]
      );
    }
  } catch (error) {
    // D1 unavailable → mirror into the local JSON file so dev still works.
    console.error("[setHeroImage] D1 write failed, using JSON fallback:", error);
    writeJsonSettings({ ...getJsonSettings(), hero_image: imageUrl ?? null });
  }
}
