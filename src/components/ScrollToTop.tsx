"use client";

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";

// useLayoutEffect runs synchronously before the browser paints, so the jump to
// the top happens on the very first frame — no visible flash of a restored or
// mid-page scroll position. It does nothing on the server, hence the isomorphic
// wrapper (avoids React's "useLayoutEffect does nothing on the server" warning).
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Forces the window back to the very top on every page change AND on refresh.
// Next.js normally preserves scroll position across soft navigations, and the
// browser restores it on a hard refresh — the user wants the opposite: after a
// refresh, always start at the top of the page.
export default function ScrollToTop() {
  const pathname = usePathname();

  // On refresh, the browser would restore the previous scroll position.
  // Telling it not to restore means the page loads at the top naturally, and
  // the layout effect below is just a safety net.
  useIsomorphicLayoutEffect(() => {
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname]);

  return null;
}
