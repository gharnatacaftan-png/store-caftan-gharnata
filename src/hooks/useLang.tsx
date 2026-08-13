"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Lang, LANGUAGES } from "@/lib/i18n";

const LS_KEY = "caftan_lang";

interface LangContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  dir: "rtl" | "ltr";
}

const LangContext = createContext<LangContextType>({
  lang: "ar",
  setLang: () => {},
  dir: "rtl",
});

export function LangProvider({ children, initialLang }: { children: ReactNode; initialLang?: Lang }) {
  // Initialize from initialLang (the server's snapshot) on BOTH server and
  // client so the first client render matches the server HTML — otherwise a
  // localStorage value that differs from the cookie would cause a hydration
  // mismatch (server "fr" vs client "ar"). localStorage is adopted right
  // after hydration via the effect below.
  const [lang, setLangState] = useState<Lang>(initialLang ?? "ar");

  // Adopt the persisted language only after mount (post-hydration) so the
  // client never disagrees with the server on first paint.
  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY) as Lang | null;
    if (saved && LANGUAGES.some((l) => l.code === saved)) {
      setLangState(saved);
    }
  }, []);

  // Update html lang+dir attributes whenever language changes
  useEffect(() => {
    const info = LANGUAGES.find((l) => l.code === lang);
    if (!info) return;
    document.documentElement.lang = lang;
    document.documentElement.dir = info.dir;
  }, [lang]);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(LS_KEY, l);
      // Keep the server in sync so the next full page load renders in the
      // chosen language — the server reads this cookie to set <html lang/dir>
      // and pass initialLang to this provider (no flash on refresh).
      document.cookie = `${LS_KEY}=${l};path=/;max-age=31536000;SameSite=Lax`;
    }
  }

  const dir = LANGUAGES.find((l) => l.code === lang)?.dir ?? "rtl";

  return (
    <LangContext.Provider value={{ lang, setLang, dir }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
