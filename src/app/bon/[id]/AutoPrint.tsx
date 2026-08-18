"use client";

import { useEffect } from "react";

export default function AutoPrint() {
  useEffect(() => {
    let timer: NodeJS.Timeout;

    const triggerPrint = () => {
      // 350ms buffer ensures React hydration, images, and fonts are completely rendered before print modal opens
      timer = setTimeout(() => {
        window.print();
      }, 350);
    };

    if (document.readyState === "complete") {
      triggerPrint();
    } else {
      window.addEventListener("load", triggerPrint, { once: true });
      return () => {
        window.removeEventListener("load", triggerPrint);
        if (timer) clearTimeout(timer);
      };
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
