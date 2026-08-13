// lib/admin-lang.ts — Server-side language resolution for the admin dashboard.
// The admin language preference is persisted by AdminLangProvider into both
// localStorage (client components via useLang) and a `caftan_admin_lang`
// cookie. Server components (e.g. the dashboard) read the cookie here.

import { cookies } from "next/headers";
import type { Lang } from "./i18n";
import { t } from "./i18n";
import { ADMIN_LANG_COOKIE } from "./admin-lang-cookie";

export { ADMIN_LANG_COOKIE } from "./admin-lang-cookie";

export async function getAdminLang(): Promise<Lang> {
  try {
    const store = await cookies();
    const value = store.get(ADMIN_LANG_COOKIE)?.value as Lang | undefined;
    return value === "fr" || value === "en" || value === "ar" ? value : "ar";
  } catch {
    return "ar";
  }
}

/**
 * Server-side admin translator. Reads the `caftan_admin_lang` cookie so server
 * actions (e.g. login errors, cleanup authorization errors) return messages in
 * the same language the admin selected in the UI.
 */
export async function adminT() {
  const lang = await getAdminLang();
  return t(lang).admin;
}
