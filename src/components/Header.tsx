"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from "framer-motion";

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const { scrollY } = useScroll();
  
  // Header height shrinks from 80px to 56px after scrolling
  const headerHeight = useTransform(scrollY, [0, 80], ["5rem", "3.5rem"]);
  const logoSize = useTransform(scrollY, [0, 80], ["3.5rem", "2.25rem"]);
  const logoText = useTransform(scrollY, [0, 80], ["1.25rem", "1rem"]);
  const bgOpacity = useTransform(scrollY, [0, 60], [0.97, 1]);

  useMotionValueEvent(scrollY, "change", (latest) => {
    // Set scrolled state for shadow and blur
    setScrolled(latest > 40);
  });

  const links = [
    { href: "/", label: "الرئيسية" },
    { href: "/shop", label: "المتجر" },
    { href: "/shipping", label: "سياسة التوصيل" },
  ];

  return (
    <>
      <motion.header
        className="sticky top-0 z-50 w-full overflow-hidden transition-shadow duration-300"
        style={{ height: headerHeight, boxShadow: scrolled ? "0 4px 24px rgba(0,0,0,0.35)" : "0 2px 8px rgba(0,0,0,0.1)" }}
      >
        {/* Background with blur when scrolled */}
        <motion.div
          className="absolute inset-0 bg-primary"
          style={{ opacity: bgOpacity }}
        />
        {scrolled && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 backdrop-blur-sm bg-primary/95"
          />
        )}

        <div className="relative w-full h-full px-4 lg:px-8 flex items-center justify-between gap-4">

          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group shrink-0" onClick={() => setMenuOpen(false)}>
            <motion.div
              style={{ width: logoSize, height: logoSize }}
              className="relative overflow-hidden group-hover:scale-105 transition-transform duration-300 shrink-0"
            >
              <Image src="/logo.jpg" alt="شعار قفطان غرناطة" fill className="object-contain" />
            </motion.div>
            <motion.div
              style={{ fontSize: logoText }}
              className="text-accent font-bold tracking-wide group-hover:scale-105 transition-transform duration-300 whitespace-nowrap"
            >
              قفطان غرناطة
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
                {/* Underline animation on hover */}
                <span className="absolute bottom-0 right-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300 origin-right" />
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2 text-white hover:text-accent transition-colors duration-200"
              aria-label="Cart"
            >
              <ShoppingBag className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="absolute top-0 right-0 bg-accent text-primary text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">0</span>
            </motion.button>

            {/* Hamburger — mobile only */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="md:hidden p-2 text-white hover:text-accent transition-colors duration-200"
              aria-label={menuOpen ? "إغلاق القائمة" : "فتح القائمة"}
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
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.45, ease: "easeInOut" }}
              className="fixed top-0 left-0 bottom-0 z-50 w-72 bg-primary text-white flex flex-col pt-20 pb-10 px-8 gap-5 shadow-2xl md:hidden"
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
                <div className="relative w-10 h-10 shrink-0">
                  <Image src="/logo.jpg" alt="شعار" fill className="object-contain" />
                </div>
                <span className="text-accent text-lg font-bold">قفطان غرناطة</span>
              </div>

              {/* Nav Links */}
              {links.map((l, i) => (
                <motion.div
                  key={l.href}
                  initial={{ opacity: 0, x: -30 }}
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
    </>
  );
}
