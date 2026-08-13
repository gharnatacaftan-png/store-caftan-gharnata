"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

// Module-level set: tracks paths already sent in this browser session
// Prevents double-fire from React StrictMode and fast client navigation
const sentPaths = new Set<string>();

/**
 * VisitTracker — Silent client-side component.
 * Sends a fire-and-forget POST to /api/track on every page navigation.
 * Renders nothing. Never blocks page load.
 */
export default function VisitTracker() {
  const pathname = usePathname();
  const isSending = useRef(false);

  useEffect(() => {
    // Skip admin routes
    if (pathname.startsWith("/gharnata-portal-x92")) return;
    // Skip 404 / error pages
    if (pathname.startsWith("/404") || pathname.startsWith("/_not-found") || pathname.startsWith("/_error")) return;

    // Already tracked this path in this session OR currently sending → skip
    if (sentPaths.has(pathname) || isSending.current) return;

    isSending.current = true;
    sentPaths.add(pathname);

    const payload = JSON.stringify({ path: pathname });

    // Use sendBeacon if available (most non-blocking)
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      const blob = new Blob([payload], { type: "application/json" });
      navigator.sendBeacon("/api/track", blob);
    } else {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {});
    }

    isSending.current = false;
  }, [pathname]);

  return null;
}

