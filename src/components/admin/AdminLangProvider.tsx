"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { LangProvider, useLang } from "@/hooks/useLang";
import { ADMIN_LANG_COOKIE } from "@/lib/admin-lang-cookie";
import type { Lang } from "@/lib/i18n";

// Keep the server (dashboard page, proxy, etc.) in sync with the language the
// client picks, so server components render in the same language. This mirrors
// the storefront preference (same origin + localStorage) while adding a cookie.
//
// The critical part is the router.refresh(): server components (e.g. the
// dashboard) read the language from this cookie at render time, so after the
// client writes a new cookie we must force them to re-render or they keep
// showing the previous language.
function AdminLangSync() {
  const { lang } = useLang();
  const router = useRouter();
  const firstRun = useRef(true);

  useEffect(() => {
    // First render uses the hardcoded default ("ar") before useLang hydrates
    // from localStorage — skip it to avoid clobbering the persisted cookie.
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    const current = document.cookie
      .split("; ")
      .find(c => c.startsWith(`${ADMIN_LANG_COOKIE}=`))
      ?.split("=")[1];
    if (current !== lang) {
      document.cookie = `${ADMIN_LANG_COOKIE}=${lang};path=/;max-age=31536000;SameSite=Lax${location.protocol === "https:" ? ";Secure" : ""}`;
      router.refresh();
    }
  }, [lang, router]);

  return null;
}

export default function AdminLangProvider({ children, initialLang }: { children: React.ReactNode; initialLang?: Lang }) {
  return (
    <LangProvider initialLang={initialLang}>
      <AdminLangSync />
      {children}
    </LangProvider>
  );
}
