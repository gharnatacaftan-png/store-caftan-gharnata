"use client";

import Image from "next/image";
import Link from "next/link";
import { Filter } from "lucide-react";
import { motion } from "framer-motion";

export default function Shop() {
  const products = [
    { id: 1, name: "قفطان الملكة", price: "45,000", category: "قفطان عروس", image: "/images/category_bridal.png" },
    { id: 2, name: "قفطان الأصالة", price: "38,000", category: "تصديرة", image: "/images/category_tasdira.png" },
    { id: 3, name: "قفطان الأندلس", price: "32,000", category: "قفطان عصري", image: "/images/category_modern.png" },
    { id: 4, name: "قفطان جوهرة", price: "52,000", category: "قفطان عروس", image: "/images/category_bridal.png" },
    { id: 5, name: "قفطان الزين", price: "40,000", category: "تصديرة", image: "/images/category_tasdira.png" },
    { id: 6, name: "قفطان النجمة", price: "28,000", category: "قفطان عصري", image: "/images/category_modern.png" },
    { id: 7, name: "قفطان العز", price: "60,000", category: "قفطان عروس", image: "/images/category_bridal.png" },
    { id: 8, name: "قفطان الهمة", price: "42,000", category: "تصديرة", image: "/images/category_tasdira.png" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="bg-background min-h-screen py-10 sm:py-12 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 sm:mb-12 text-center"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-3">تشكيلة القفطان</h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">
            تصفحي أحدث تشكيلات القفطان الجزائري الأصيل واختاري ما يناسب ذوقك الرفيع.
          </p>
        </motion.div>

        {/* Filters and Grid */}
        <div className="flex flex-col md:flex-row gap-6 sm:gap-8">
          {/* Sidebar Filters — horizontal on mobile, vertical on md+ */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full md:w-56 lg:w-64 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 md:sticky md:top-28 md:h-fit"
          >
            <div className="flex items-center gap-2 font-bold text-primary mb-4 sm:mb-6 border-b pb-3 sm:pb-4">
              <Filter className="w-5 h-5 text-accent" />
              تصفية المنتجات
            </div>

            <h3 className="font-bold mb-3 text-gray-800 text-sm sm:text-base">التصنيفات</h3>
            {/* On mobile: horizontal pill-style filters */}
            <div className="flex flex-wrap gap-2 md:hidden">
              {["الكل", "قفطان عروس", "قفطان عصري", "تصديرة"].map((cat) => (
                <button key={cat} className="px-3 py-1 rounded-full border border-gray-300 text-sm text-gray-600 hover:bg-accent hover:text-primary hover:border-accent transition-all">
                  {cat}
                </button>
              ))}
            </div>

            {/* On desktop: checkboxes */}
            <ul className="hidden md:block space-y-3">
              {[
                { label: "الكل", checked: true },
                { label: "قفطان عروس", checked: false },
                { label: "قفطان عصري", checked: false },
                { label: "تصديرة", checked: false },
              ].map((item) => (
                <li key={item.label}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 accent-accent rounded" defaultChecked={item.checked} />
                    <span className="text-gray-600">{item.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </motion.aside>

          {/* Product Grid */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            {products.map((product) => (
              <motion.div key={product.id} variants={itemVariants}>
                <Link href={`/product/${product.id}`} className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-50 block">
                  <div className="relative h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/90 backdrop-blur text-primary text-xs font-bold px-2 sm:px-3 py-1 rounded-full shadow-sm">
                      {product.category}
                    </div>
                  </div>
                  <div className="p-3 sm:p-6 text-center">
                    <h3 className="text-sm sm:text-xl font-bold text-primary mb-1 sm:mb-2 group-hover:text-accent transition-colors">{product.name}</h3>
                    <p className="text-primary font-bold text-sm sm:text-lg">{product.price} د.ج</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
