// lib/social-links.ts — Shared, client-safe helper to derive the list of
// ACTIVE social networks, phones and addresses (each with its own map link)
// from the store settings. Used by the storefront footer and the printed
// order/delivery slips so both stay in sync with what the admin toggled in
// the dashboard.
//
// NOTE: must NOT import lib/settings directly (it pulls `fs`/`path` for the
// JSON fallback and would break client bundles) — type-only imports only.

import type { SiteSettings } from "./settings";

// Structural subset of SiteSettings — lets callers with their own settings
// shape (e.g. the admin OrdersClient) pass their object without casting.
export type SocialSettings = Partial<SiteSettings>;

export interface SocialLink {
  network: "whatsapp" | "instagram" | "facebook" | "tiktok" | "x";
  // Network label printed on slips — identical in all languages.
  label: string;
  href: string;
  // Short human form (handle / page name) for display.
  display: string;
}

// Last meaningful path segment of a URL ("@handle" or page name), falling
// back to the bare hostname when the URL has no path.
function linkDisplay(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split("/").filter(Boolean).pop();
    return seg ? decodeURIComponent(seg) : u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  }
}

/**
 * Returns only the networks the admin enabled AND that have a value.
 * Order is stable: WhatsApp → Instagram → Facebook → TikTok → X.
 * (The map link is no longer a global network: each store address carries
 * its own link — see getActiveAddresses.)
 */
export function getActiveSocialLinks(s: SocialSettings | null | undefined): SocialLink[] {
  if (!s) return [];
  const links: SocialLink[] = [];

  // WhatsApp: reuse the `whatsapp` setting (international digits, e.g.
  // "2135xxxxxxxx") — shown when filled, no dedicated toggle needed.
  const wa = (s.whatsapp || "").trim().replace(/[^\d+]/g, "");
  if (wa) {
    const waDisplay = `+${wa.replace(/^\+/, "")}`;
    links.push({
      network: "whatsapp",
      label: "WhatsApp",
      href: `https://wa.me/${wa.replace(/^\+/, "")}`,
      display: waDisplay,
    });
  }

  const ig = (s.instagram || "").trim();
  if (s.instagram_enabled && ig) {
    const href = /^https?:\/\//i.test(ig) ? ig : `https://instagram.com/${ig.replace(/^@/, "")}`;
    links.push({ network: "instagram", label: "Instagram", href, display: /^https?:\/\//i.test(ig) ? linkDisplay(ig) : `@${ig.replace(/^@/, "")}` });
  }
  const fb = (s.facebook || "").trim();
  if (s.facebook_enabled && fb) {
    const rawDisp = linkDisplay(fb);
    // If disp is a random alphanumeric hash/ID like 19C4oP55Jx, display Caftan Gharnata
    const fbDisplay = /^[A-Za-z0-9_-]{8,}$/.test(rawDisp) || /id=\d+/.test(rawDisp) ? "Caftan Gharnata" : rawDisp;
    links.push({ network: "facebook", label: "Facebook", href: fb, display: fbDisplay });
  }
  const tt = (s.tiktok || "").trim();
  if (s.tiktok_enabled && tt) {
    links.push({ network: "tiktok", label: "TikTok", href: tt, display: linkDisplay(tt) });
  }
  const xl = (s.x_link || "").trim();
  if (s.x_enabled && xl) {
    links.push({ network: "x", label: "X", href: xl, display: linkDisplay(xl) });
  }

  return links;
}

/** Slip-friendly one-liner, e.g. "Instagram: @x · TikTok: @y · Maps: z". */
export function socialLinksLine(s: SocialSettings | null | undefined): string {
  return getActiveSocialLinks(s)
    .map(l => `${l.label}: ${l.display}`)
    .join(" · ");
}

/** Enabled + non-empty phone numbers, in order phone1 → phone2 → phone3. */
export function getActivePhones(s: SocialSettings | null | undefined): string[] {
  if (!s) return [];
  const phones: string[] = [];
  const p1 = (s.phone1 || "").trim();
  const p2 = (s.phone2 || "").trim();
  const p3 = (s.phone3 || "").trim();
  if (s.phone1_enabled && p1) phones.push(p1);
  if (s.phone2_enabled && p2) phones.push(p2);
  if (s.phone3_enabled && p3) phones.push(p3);
  return phones;
}

/** A store address the admin enabled + filled, with its own map link. */
export interface ActiveAddress {
  text: string;
  // Google Maps link for THIS address ("" when the admin left it empty).
  url: string;
}

/** Enabled + non-empty store addresses, in order address1 → 2 → 3 → 4. */
export function getActiveAddresses(s: SocialSettings | null | undefined): ActiveAddress[] {
  if (!s) return [];
  const addresses: ActiveAddress[] = [];
  const push = (text?: string, url?: string, enabled?: boolean) => {
    if (enabled && text && text.trim()) addresses.push({ text: text.trim(), url: (url || "").trim() });
  };
  push(s.address1, s.address1_url, s.address1_enabled);
  push(s.address2, s.address2_url, s.address2_enabled);
  push(s.address3, s.address3_url, s.address3_enabled);
  push(s.address4, s.address4_url, s.address4_enabled);
  return addresses;
}
