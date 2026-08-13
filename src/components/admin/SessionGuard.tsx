"use client";

import { useEffect } from "react";

/**
 * SessionGuard — client-side admin session guard.
 *
 * A browser refresh (F5 / Ctrl+R) must NOT keep the dashboard open: it is a
 * full page reload straight into a sensitive area, so for security we bounce
 * the visitor to /404 instead. To refresh data, the admin uses the internal
 * refresh buttons (router.refresh()), which never trigger a full reload.
 *
 * The Navigation Timing API tells us the kind of load:
 *   - "navigate"   → real navigation (typing the URL, login redirect) → allowed
 *   - "reload"     → F5 / Ctrl+R on the dashboard → rejected (→ /404)
 *   - "back_forward" → browser back/forward navigation
 *
 * sessionStorage ("gharnata_admin_tab") additionally guarantees that the admin
 * logged in during this browser tab session: closing the tab clears it, so the
 * next visit requires re-login. When we bounce the user out, we also clear it
 * so a later direct visit to the dashboard URL is rejected too.
 *
 * NOTE: We do NOT send a logout beacon on beforeunload because it fires on
 * page refresh too, and sendBeacon may not include cookies everywhere. The
 * server-side iron-session cookie still expires after 4 hours.
 */
export function SessionGuard() {
  useEffect(() => {
    // Detect a true browser refresh. getEntriesByType("navigation") is the
    // modern API; performance.navigation is the legacy fallback (1 = reload).
    let navType = "navigate";
    try {
      const entries = performance.getEntriesByType("navigation");
      if (entries.length > 0) {
        navType = (entries[0] as PerformanceNavigationTiming).type;
      } else if (performance.navigation) {
        navType = performance.navigation.type === 1 ? "reload" : "navigate";
      }
    } catch {
      // Timing API unavailable — fall through to the sessionStorage check.
    }

    if (navType === "reload") {
      sessionStorage.removeItem("gharnata_admin_tab");
      window.location.replace("/404");
      return;
    }

    if (sessionStorage.getItem("gharnata_admin_tab") !== "active") {
      window.location.replace("/404");
      return;
    }
  }, []);

  return null;
}
