"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import type { Product } from "@/lib/types";

export function NewArrivalsSection({ products }: { products: Product[] }) {
  const { lang } = useLang();
  const tx = t(lang);
  const latestProducts = products.slice(0, 4);

  if (latestProducts.length === 0) return null;

  return (
    <section className="py-16 sm:py-24 bg-white overflow-hidden w-full">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center mb-12 sm:mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-primary relative inline-block">
            {tx.home("new_arrivals")}
            <motion.span
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 sm:w-28 h-1 bg-accent origin-left block"
            />
          </h2>
          <p className="mt-6 text-gray-500 text-sm sm:text-base max-w-xl mx-auto">{tx.home("new_arrivals_sub")}</p>
          <Link href="/shop" className="mt-6 inline-flex items-center gap-1 text-accent font-bold hover:text-primary transition-colors text-sm sm:text-base group">
            {tx.common("all")}
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
          {latestProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              whileHover={{ y: -6 }}
            >
              <Link href={`/product/${product.id}`} className="group bg-background rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 block relative border border-gray-100">
                <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden">
                  <Image
                    src={product.images?.[0] || "/images/hero_caftan.webp"}
                    alt={product.name}
                    fill
                    unoptimized
                    className="object-cover transition-transform duration-700 group-hover:scale-108"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
                  <div className="absolute top-3 right-3 bg-accent text-primary text-[11px] sm:text-xs font-bold px-2.5 py-1 rounded-full shadow-md z-10">
                    {tx.common("new")}
                  </div>
                  <motion.div className="absolute bottom-3 left-3 bg-primary/90 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm shadow-md">
                    {product.price.toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR")} {tx.common("currency")}
                  </motion.div>
                </div>
                <div className="p-3 sm:p-5 text-center">
                  <h3 className="text-sm sm:text-lg font-bold text-primary mb-1 group-hover:text-accent transition-colors duration-300 truncate">
                    {lang === "fr" ? (product.name_fr || product.name) : lang === "en" ? (product.name_en || product.name) : product.name}
                  </h3>
                  <p className="text-accent font-bold text-sm sm:text-base">{product.price.toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR")} {tx.common("currency")}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
