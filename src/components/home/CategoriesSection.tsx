"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import LogoLoop from "@/components/LogoLoop";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { resolveMediaUrl } from "@/lib/media-utils";

function SectionTitle({ children, sub }: { children: string; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      className="text-center mb-12 sm:mb-16"
    >
      <h2 className="text-3xl sm:text-4xl font-bold text-primary relative inline-block">
        {children}
        <motion.span
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 sm:w-28 h-1 bg-accent origin-left block"
        />
      </h2>
      {sub && <p className="mt-6 text-gray-500 text-sm sm:text-base max-w-xl mx-auto">{sub}</p>}
    </motion.div>
  );
}

type CategoryItem = {
  id: number;
  slug: string;
  title: string;
  sub: string;
  image: string;
  href: string;
};

export function CategoriesSection({ categories }: { categories: CategoryItem[] }) {
  const { lang } = useLang();
  const tx = t(lang);

  if (categories.length === 0) return null;

  return (
    <section className="py-8 sm:py-12 bg-background w-full overflow-hidden">
      <div className="container mx-auto px-4 mb-6 md:mb-10">
        <SectionTitle sub={tx.home("categories_sub")}>
          {tx.home("categories_title")}
        </SectionTitle>
      </div>

      {/* Mobile Swipe Indicator */}
      <div className="flex flex-col md:hidden items-center justify-center gap-1 mb-6 text-accent/90 font-bold text-base bg-accent/5 py-2 px-12 rounded-3xl w-max mx-auto border border-accent/10" style={{ direction: 'rtl' }}>
        <span className="mb-1 text-sm tracking-wide">{tx.home("swipe_hint")}</span>
        <motion.div
          animate={{ x: [0, -30, 30, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          className="text-2xl flex items-center justify-center drop-shadow-md"
        >
          👆
        </motion.div>
      </div>

      {/* Mobile: Native Horizontal Scroll */}
      <div className="flex md:hidden overflow-x-auto gap-4 pb-8 snap-x snap-mandatory px-4 -mx-4 hide-scrollbar" style={{ direction: 'ltr' }}>
        {categories.map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className="relative w-[75vw] max-w-[280px] h-[400px] rounded-2xl overflow-hidden shadow-xl shrink-0 snap-center group/card block"
          >
            <Image
              src={resolveMediaUrl(category.image)}
              alt={category.title}
              fill
              className="object-cover transition-transform duration-700 group-hover/card:scale-110"
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent" />

            <div className="absolute inset-x-0 bottom-6 text-center z-10 flex flex-col items-center justify-end" style={{ direction: 'rtl' }}>
              <p className="text-accent text-xs font-bold tracking-[0.2em] mb-1 uppercase opacity-90">
                {category.sub}
              </p>
              <h3 className="text-2xl font-bold text-white drop-shadow-lg mb-2">
                {category.title}
              </h3>
              <span className="text-accent font-semibold text-sm border border-accent/50 px-5 py-1.5 rounded-full inline-block bg-black/40 backdrop-blur-sm">
                {tx.home("explore")}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Desktop: Marquee strip with LogoLoop */}
      <div className="hidden md:block" style={{ direction: 'ltr' }}>
        <LogoLoop
          logos={categories}
          speed={40}
          direction="left"
          gap={20}
          logoHeight={384}
          pauseOnHover={true}
          renderItem={(item) => {
            const category = item as unknown as CategoryItem;
            return (
            <Link
              href={category.href}
              className="relative w-80 h-96 rounded-2xl overflow-hidden shadow-2xl shrink-0 group/card block"
            >
              <Image
                src={resolveMediaUrl(category.image)}
                alt={category.title}
                fill
                className="object-cover transition-transform duration-700 group-hover/card:scale-110"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-br from-accent/0 to-accent/0 group-hover/card:from-accent/10 group-hover/card:to-transparent transition-all duration-500" />
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-accent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-500" />

              <div className="absolute inset-x-0 bottom-6 text-center z-10 flex flex-col items-center justify-end" style={{ direction: 'rtl' }}>
                <p className="text-accent text-xs font-bold tracking-[0.2em] mb-1 uppercase opacity-80 transform transition-transform duration-300 group-hover/card:-translate-y-6">
                  {category.sub}
                </p>
                <h3 className="text-2xl font-bold text-white drop-shadow-lg transform transition-transform duration-300 group-hover/card:-translate-y-6">
                  {category.title}
                </h3>

                <div className="absolute bottom-0 left-0 right-0 opacity-0 group-hover/card:opacity-100 translate-y-2 group-hover/card:translate-y-0 transition-all duration-300">
                  <span className="text-accent font-semibold text-sm border border-accent/50 px-4 py-1 rounded-full inline-block bg-black/20 backdrop-blur-sm">
                    {tx.home("explore")}
                  </span>
                </div>
              </div>
            </Link>
          );
          }}
        />
      </div>
    </section>
  );
}
