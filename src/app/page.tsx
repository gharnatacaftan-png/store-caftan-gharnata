"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Star, Shield, Truck } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/* ── Reusable animated section title ─────────────────── */
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

/* ── Parallax hero image ──────────────────────────────── */
function ParallaxHero() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);

  return (
    <section ref={ref} className="relative h-screen flex items-center justify-center overflow-hidden w-full bg-black">
      <motion.div style={{ y }} className="absolute inset-0 z-0 scale-110">
        <Image
          src="/images/hero_caftan.png"
          alt="قفطان غرناطة"
          fill
          className="object-cover object-center lg:object-contain"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
      </motion.div>

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        {/* Golden divider line */}
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
          قفطان غرناطة.. أصالة تتوارثها الأجيال
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.75 }}
          className="text-base sm:text-xl md:text-2xl text-white/90 mb-8 sm:mb-10 px-2"
        >
          اكتشفي أرقى تصاميم القفطان الجزائري الفاخر لإطلالة ملكية في مناسباتك السعيدة.
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
            تسوقي الآن
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
        </motion.div>

        {/* Golden divider line bottom */}
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

/* ── Trust badges ─────────────────────────────────────── */
function TrustBadges() {
  const badges = [
    { icon: <Shield className="w-7 h-7" />, title: "دفع آمن", text: "الدفع عند الاستلام في كل الولايات" },
    { icon: <Truck className="w-7 h-7" />, title: "توصيل سريع", text: "24 إلى 72 ساعة لجميع ولايات الجزائر" },
    { icon: <Star className="w-7 h-7" />, title: "جودة فاخرة", text: "مواد عالية الجودة وتطريز يدوي أصيل" },
  ];

  return (
    <section className="py-10 bg-primary w-full overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6"
        >
          {badges.map((b, i) => (
            <motion.div
              key={i}
              variants={{ hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              className="flex items-center gap-4 text-white p-4 rounded-xl border border-white/10 hover:border-accent/40 transition-all duration-300 group"
            >
              <div className="text-accent group-hover:scale-110 transition-transform duration-300 shrink-0">{b.icon}</div>
              <div>
                <div className="font-bold text-accent text-base">{b.title}</div>
                <div className="text-white/70 text-sm">{b.text}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ── Main page ────────────────────────────────────────── */
export default function Home() {
  const categories = [
    { id: 1, title: "قفطان عروس", image: "/images/category_bridal.png" },
    { id: 2, title: "قفطان عصري", image: "/images/category_modern.png" },
    { id: 3, title: "تصديرة", image: "/images/category_tasdira.png" },
  ];

  const newArrivals = [
    { id: 1, name: "قفطان الملكة", price: "45,000", image: "/images/category_bridal.png" },
    { id: 2, name: "قفطان الأصالة", price: "38,000", image: "/images/category_tasdira.png" },
    { id: 3, name: "قفطان الأندلس", price: "32,000", image: "/images/category_modern.png" },
    { id: 4, name: "قفطان جوهرة", price: "52,000", image: "/images/category_bridal.png" },
  ];

  return (
    <div className="flex flex-col min-h-screen">

      {/* ── Hero with parallax ── */}
      <ParallaxHero />

      {/* ── Trust badges ── */}
      <TrustBadges />

      {/* ── Categories ── */}
      <section className="py-16 sm:py-24 bg-background overflow-hidden w-full">
        <div className="container mx-auto px-4">
          <SectionTitle sub="اكتشفي تشكيلاتنا المتنوعة من الأزياء التراثية الجزائرية الأصيلة">
            تسوقي حسب التصنيف
          </SectionTitle>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            {categories.map((category, i) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 60, scale: 0.95 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, delay: i * 0.15, ease: "easeOut" }}
              >
                <Link href="/shop" className="group relative h-72 sm:h-96 rounded-2xl overflow-hidden shadow-xl block">
                  <Image
                    src={category.image}
                    alt={category.title}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

                  {/* Hover overlay shimmer */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-br from-accent/10 to-transparent" />

                  <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 text-center z-10">
                    <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 transform transition-transform duration-300 group-hover:-translate-y-2 drop-shadow-lg">
                      {category.title}
                    </h3>
                    <motion.span
                      className="inline-block text-accent font-semibold text-sm border border-accent/50 px-4 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300"
                    >
                      عرض المجموعة ←
                    </motion.span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* ── New Arrivals ── */}
      <section className="py-16 sm:py-24 bg-white overflow-hidden w-full">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6 }}
            className="flex justify-between items-end mb-10 sm:mb-14"
          >
            <h2 className="text-2xl sm:text-4xl font-bold text-primary relative">
              وصل حديثاً
              <motion.span
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="absolute -bottom-3 right-0 w-20 sm:w-24 h-1 bg-accent origin-right block"
              />
            </h2>
            <Link href="/shop" className="text-accent font-bold hover:text-primary transition-colors flex items-center gap-1 text-sm sm:text-base group">
              عرض الكل
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {newArrivals.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.6, delay: i * 0.12 }}
                whileHover={{ y: -6 }}
              >
                <Link href={`/product/${product.id}`} className="group bg-background rounded-xl overflow-hidden shadow-sm hover:shadow-2xl transition-shadow duration-500 block">
                  <div className="relative h-48 sm:h-64 md:h-80 overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-108"
                    />
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors duration-300" />
                    {/* Price badge on hover */}
                    <motion.div className="absolute top-3 left-3 bg-accent text-primary text-xs font-bold px-2 py-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {product.price} د.ج
                    </motion.div>
                  </div>
                  <div className="p-3 sm:p-5 text-center">
                    <h3 className="text-sm sm:text-lg font-bold text-primary mb-1 group-hover:text-accent transition-colors duration-300">{product.name}</h3>
                    <p className="text-accent font-bold text-sm sm:text-base">{product.price} د.ج</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <motion.section
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="relative py-16 sm:py-20 bg-primary overflow-hidden"
      >
        {/* Decorative circles */}
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
            هل أنت جاهزة لإطلالتك الملكية؟
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-white/70 mb-8 text-sm sm:text-lg"
          >
            اطلبي قفطانك الآن والدفع عند الاستلام — توصيل لجميع ولايات الجزائر
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
              تسوقي الآن
              <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
            </Link>
          </motion.div>
        </div>
      </motion.section>

    </div>
  );
}
