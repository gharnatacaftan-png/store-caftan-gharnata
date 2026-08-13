"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLang } from "@/hooks/useLang";
import { LANGUAGES, Lang } from "@/lib/i18n";

const LS_KEY = "caftan_lang";

// First-visit language chooser. Shown only when no language has ever been saved
// (neither in localStorage nor in the cookie). Picking a language calls setLang,
// which persists both — so the plate never reappears on this device. The ✕
// dismisses it for this session only (nothing is saved, it comes back next visit).
export default function LanguagePlate() {
  const { setLang } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(LS_KEY);
    } catch {
      // storage unavailable — fall through to cookie check
    }
    const cookieLang = document.cookie
      .split("; ")
      .find(c => c.startsWith(`${LS_KEY}=`))
      ?.split("=")[1];

    if (!saved && !cookieLang) {
      // Small delay so the page paints before the plate fades in.
      const timer = setTimeout(() => setVisible(true), 120);
      return () => clearTimeout(timer);
    }
  }, []);

  function choose(code: Lang) {
    setLang(code);
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm"
            onClick={() => setVisible(false)}
          />

          {/* Plate */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed inset-0 z-[130] flex items-center justify-center p-4"
          >
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              {/* Close (session-only dismissal) */}
              <button
                onClick={() => setVisible(false)}
                className="absolute top-3 end-3 p-2 text-gray-400 hover:text-primary transition-colors z-10"
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Gold top band */}
              <div className="h-2 bg-gradient-to-r from-[#D4AF37] via-[#F5D061] to-[#C5A059]" />

              <div className="p-6 sm:p-8 text-center">
                <div className="relative w-20 h-20 mx-auto mb-4">
                  <Image src="/logo.jpg" alt="شعار قفطان غرناطة" fill sizes="80px" className="object-contain" />
                </div>

                <h1 className="text-2xl font-bold text-primary mb-1">
                  قفطان غرناطة <span className="text-[#D4AF37]">·</span> Caftan Gharnata
                </h1>
                <p className="text-gray-500 text-sm mb-6">
                  مرحباً بك · Bienvenue · Welcome
                </p>

                <p className="font-bold text-gray-800 mb-4">
                  اختر لغة الموقع <span className="text-gray-400">·</span> Choisissez votre langue
                </p>

                <div className="flex flex-col gap-3">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => choose(l.code as Lang)}
                      className="flex items-center justify-between px-5 py-3 rounded-2xl border-2 border-[#D4AF37]/40 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 hover:border-[#D4AF37] text-primary font-bold text-base transition-all group"
                    >
                      <span>{l.label}</span>
                      <span className="text-xs text-[#D4AF37] font-semibold group-hover:translate-x-[-2px] transition-transform">
                        {l.code === "ar" ? "العربية" : l.code === "fr" ? "Français" : "English"}
                      </span>
                    </button>
                  ))}
                </div>

                <p className="text-xs text-gray-400 mt-5">
                  سيتم حفظ اختيارك · Votre choix sera mémorisé
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
