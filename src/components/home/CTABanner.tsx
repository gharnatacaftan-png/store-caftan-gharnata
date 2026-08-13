"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";

export function CTABanner() {
  const { lang } = useLang();
  const tx = t(lang);

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
      className="relative py-16 sm:py-20 bg-primary overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="container mx-auto px-4 text-center relative z-10">
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="w-16 h-0.5 bg-accent mx-auto mb-6"
        />
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-2xl sm:text-4xl font-bold text-white mb-4"
        >
          {tx.home("cta_title")}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="text-white/70 mb-8 text-sm sm:text-lg"
        >
          {tx.home("cta_sub")}
        </motion.p>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5, type: "spring" }}
        >
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-accent text-primary px-8 sm:px-12 py-3 sm:py-4 rounded-full text-base sm:text-xl font-bold hover:bg-white transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(212,175,55,0.4)]"
          >
            {tx.home("cta_btn")}
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
        </motion.div>
      </div>
    </motion.section>
  );
}
