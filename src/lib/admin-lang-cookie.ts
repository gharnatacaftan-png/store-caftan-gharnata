// lib/admin-lang-cookie.ts — Cookie name for the admin language preference.
// Kept in its own module (no next/headers import) so client components like
// AdminLangProvider can import it without pulling server-only APIs.

export const ADMIN_LANG_COOKIE = "caftan_admin_lang";
