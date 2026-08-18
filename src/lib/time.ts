// Centralised, timezone-safe date formatting for the whole store.
//
// Orders are stored via `CURRENT_TIMESTAMP`, i.e. in UTC (SQLite). The app
// runtime (Vercel/node/CF Workers) also runs in UTC, so rendering a Date with
// default options yields UTC and shows up one hour behind real local time in
// Algeria (Africa/Algiers, UTC+1, no DST since 2018).
//
// Fix: always render using the explicit `Africa/Algiers` timeZone and parse
// SQLite timestamps as UTC so every screen (storefront, printable slip,
// dashboard, Telegram message) shows the exact wall-clock time the customer
// actually placed the order at.

export const STORE_TIMEZONE = "Africa/Algiers";

export function parseUtcDate(iso: string | Date): Date {
  if (iso instanceof Date) return iso;
  if (!iso) return new Date();
  let str = String(iso).trim();
  // SQLite CURRENT_TIMESTAMP returns "YYYY-MM-DD HH:MM:SS" without Z
  if (str.includes(" ") && !str.includes("T")) {
    str = str.replace(" ", "T");
  }
  if (!str.endsWith("Z") && !str.includes("+") && !str.includes("-", 11)) {
    str += "Z";
  }
  return new Date(str);
}

export function formatDate(iso: string | Date, locale: string): string {
  const d = parseUtcDate(iso);
  return d.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: STORE_TIMEZONE,
  });
}

export function formatTime(iso: string | Date, locale: string): string {
  const d = parseUtcDate(iso);
  return d.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STORE_TIMEZONE,
  });
}

export function formatDateTime(iso: string | Date, locale: string): string {
  const d = parseUtcDate(iso);
  return d.toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STORE_TIMEZONE,
  });
}
