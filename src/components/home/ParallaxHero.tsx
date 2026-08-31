"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";

import { resolveMediaUrl } from "@/lib/media-utils";

export function ParallaxHero({ heroImage = "/images/hero_caftan.webp" }: { heroImage?: string }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const { lang } = useLang();
  const tx = t(lang);

  return (
    <section ref={ref} className="relative min-h-screen min-h-[100svh] flex items-center justify-center overflow-hidden w-full bg-black">
      <motion.div
        style={{ y }}
        initial={{ scale: 1.35, opacity: 0 }}
        animate={{ scale: 1.12, opacity: 1 }}
        transition={{ duration: 1.6, ease: "easeOut" }}
        className="absolute inset-0 z-0"
      >
        <Image
          src={resolveMediaUrl(heroImage)}
          alt="قفطان غرناطة"
          fill
          className="object-cover object-center lg:object-contain"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
      </motion.div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="w-24 h-0.5 bg-accent mx-auto mb-6"
        />

        <motion.h1
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: "easeOut" }}
          className="text-3xl sm:text-4xl md:text-6xl font-bold text-accent mb-4 sm:mb-6 leading-tight drop-shadow-2xl"
        >
          {tx.home("hero_title")}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.75 }}
          className="text-base sm:text-xl md:text-2xl text-white/90 mb-8 sm:mb-10 px-2"
        >
          {tx.home("hero_sub")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 1, type: "spring", stiffness: 120 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-accent text-primary px-8 sm:px-12 py-3 sm:py-4 rounded-full text-lg sm:text-xl font-bold hover:bg-white transition-all duration-300 hover:scale-105 shadow-[0_0_30px_rgba(212,175,55,0.5)]"
          >
            {tx.home("hero_btn")}
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 1, delay: 1.2 }}
          className="w-24 h-0.5 bg-accent mx-auto mt-8"
        />
      </div>
    </section>
  );
}
