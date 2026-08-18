// Centralised, timezone-safe date formatting for the whole store.
//
// Orders are stored via `CURRENT_TIMESTAMP`, i.e. in UTC (SQLite). The app
// runtime (Vercel/node/CF Workers) also runs in UTC, so rendering a Date with
// the default `toLocaleString` options yields UTC and shows up one hour behind
// real local time in Algeria (Africa/Algiers, UTC+1, no DST since 2018).
//
// Fix: always render using the explicit `Africa/Algiers` timeZone so every
// screen (storefront, printable slip, dashboard, Telegram message) shows the
// same wall-clock time the customer actually placed the order at.
//
// Only the time zone is pinned — the `locale` is still passed through so the
// digit style / month names follow the viewer's language.

export const STORE_TIMEZONE = "Africa/Algiers";

export function formatDate(iso: string | Date, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: STORE_TIMEZONE,
  });
}

export function formatTime(iso: string | Date, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STORE_TIMEZONE,
  });
}

export function formatDateTime(iso: string | Date, locale: string): string {
  return new Date(iso).toLocaleString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STORE_TIMEZONE,
  });
}
