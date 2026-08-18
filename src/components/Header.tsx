"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ShoppingBag, ChevronDown } from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useLang } from "@/hooks/useLang";
import { useCart } from "@/hooks/useCart";
import { t, LANGUAGES, Lang } from "@/lib/i18n";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { lang, setLang, dir } = useLang();
  const { count, openCart } = useCart();
  const tx = t(lang);

  const { scrollY } = useScroll();
  const headerHeight = useTransform(scrollY, [0, 80], ["5rem", "3.5rem"]);
  const logoSize    = useTransform(scrollY, [0, 80], ["4.5rem", "2.75rem"]);
  const logoText    = useTransform(scrollY, [0, 80], ["1.5rem", "1.125rem"]);
  const bgOpacity   = useTransform(scrollY, [0, 60], [0.97, 1]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 40);
  });

  // Same DOM order for all languages — RTL naturally reverses visual order for Arabic
  const links = [
    { href: "/",        label: tx.nav("home")     },
    { href: "/shop",    label: tx.nav("shop")     },
    { href: "/shipping",label: tx.nav("shipping") },
  ];

  const currentLang = LANGUAGES.find((l) => l.code === lang)!;

  return (
    <>
      <motion.header
        className="sticky top-0 z-50 w-full transition-shadow duration-300"
        style={{ height: headerHeight, boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.35)" : "0 2px 8px rgba(0,0,0,0.1)" }}
      >
        {/* Background */}
        <motion.div className="absolute inset-0 bg-primary overflow-hidden" style={{ opacity: bgOpacity }} />
        {scrolled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 backdrop-blur-sm bg-primary/95 overflow-hidden"
          />
        )}

        <div className="relative w-full h-full px-4 lg:px-8 flex items-center justify-between gap-4" dir={dir}>

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0" onClick={() => setMenuOpen(false)}>
            <motion.div
              style={{ width: logoSize, height: logoSize }}
              className="relative rounded-full overflow-hidden border border-accent/40 group-hover:scale-105 transition-transform duration-300 shrink-0"
            >
              <Image src="/logo.jpg" alt="شعار قفطان غرناطة" fill priority sizes="72px" className="object-cover rounded-full" />
            </motion.div>
            <motion.div
              style={{ fontSize: logoText }}
              className="hidden sm:block text-accent font-bold tracking-wide group-hover:scale-105 transition-transform duration-300 whitespace-nowrap"
            >
              {tx.common("brand")}
            </motion.div>
          </Link>

          {/* Desktop/Tablet Nav */}
          <nav className="hidden md:flex items-center gap-4 lg:gap-8 text-sm lg:text-base flex-1 justify-center">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="relative text-white hover:text-accent transition-colors duration-200 whitespace-nowrap group py-1"
              >
                {l.label}
                <span className={`absolute bottom-0 ${dir === "rtl" ? "right-0 origin-right" : "left-0 origin-left"} w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300`} />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">

            {/* ── Language Switcher ── */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-2 text-white hover:text-accent transition-all px-3 py-1.5 rounded-xl border border-accent/30 bg-black/40 hover:bg-black/60 text-xs sm:text-sm font-bold shadow-sm"
                aria-label="Switch Language"
              >
                <span>{currentLang.label}</span>
                <ChevronDown className={`w-3.5 h-3.5 text-accent transition-transform duration-200 ${langOpen ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 mt-2 bg-[#0A0A0A] border border-[#D4AF37]/30 rounded-xl shadow-2xl shadow-black/80 overflow-hidden z-50 min-w-[140px] py-1.5"
                  >
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.code}
                        onClick={() => { setLang(l.code as Lang); setLangOpen(false); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all ${
                          lang === l.code
                            ? "text-[#D4AF37] font-bold bg-[#D4AF37]/15"
                            : "text-gray-200 hover:text-[#D4AF37] hover:bg-white/5"
                        }`}
                      >
                        <span>{l.label}</span>
                        {lang === l.code && <span className="text-[#D4AF37] text-xs font-bold">✓</span>}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={openCart}
              className="relative p-2 text-white hover:text-accent transition-colors duration-200"
              aria-label={tx.shop("cart")}
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              {count > 0 && (
                <span className="absolute -top-0.5 right-0 bg-accent text-primary text-xs font-bold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                  {count}
                </span>
              )}
            </motion.button>

            {/* Hamburger — mobile only */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="md:hidden p-2 text-white hover:text-accent transition-colors duration-200"
              aria-label={menuOpen ? tx.nav("home") : tx.nav("home")}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <AnimatePresence mode="wait">
                {menuOpen ? (
                  <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMenuOpen(false)}
            />

            {/* Drawer panel */}
            <motion.nav
              initial={{ x: dir === "rtl" ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: dir === "rtl" ? "-100%" : "100%" }}
              transition={{ type: "tween", duration: 0.45, ease: "easeInOut" }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-primary text-white flex flex-col pt-20 pb-10 px-8 gap-5 shadow-2xl md:hidden"
              dir={dir}
            >
              {/* Close button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                className="absolute top-5 left-5 p-2 hover:text-accent transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <X className="w-7 h-7" />
              </motion.button>

              {/* Logo in drawer */}
              <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-5">
                <div className="relative w-12 h-12 shrink-0">
                  <Image src="/logo.jpg" alt="شعار" fill sizes="48px" className="object-contain" />
                </div>
                <span className="text-accent text-lg font-bold">{tx.common("brand")}</span>
              </div>

              {/* Nav Links */}
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: dir === "rtl" ? -30 : 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 + 0.2, duration: 0.4 }}
                >
                  <Link
                    href={l.href}
                    className="flex items-center gap-3 text-xl font-semibold hover:text-accent transition-colors block py-2 border-b border-white/5 group"
                    onClick={() => setMenuOpen(false)}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-accent group-hover:scale-150 transition-transform shrink-0" />
                    {l.label}
                  </Link>
                </motion.div>
              ))}
            </motion.nav>
          </>
        )}
      </AnimatePresence>

      {/* Close lang dropdown when clicking outside */}
      {langOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
      )}
    </>
  );
}
