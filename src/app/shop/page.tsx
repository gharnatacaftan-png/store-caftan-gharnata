"use client";

import { useEffect, useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Filter } from "lucide-react";
import { motion } from "framer-motion";
import { Product } from "@/lib/types";
import { useLang } from "@/hooks/useLang";
import { t, Lang } from "@/lib/i18n";

const CATEGORY_IDS = ["all", "caftan", "kabyle", "blouza", "karakou", "hotesse"] as const;
type CatId = typeof CATEGORY_IDS[number];

function getCategoryLabel(id: CatId, lang: Lang): string {
  const txObj = t(lang);
  if (id === "all") return txObj.common("all");
  return txObj.cat(id as "caftan" | "caftan_sub" | "kabyle" | "kabyle_sub" | "blouza" | "blouza_sub" | "karakou" | "karakou_sub" | "hotesse" | "hotesse_sub");
}

const categoryAliases: Record<string, string[]> = {
  caftan: ["caftan", "caftans", "1"],
  kabyle: ["kabyle", "robes-kabyles", "kabyles", "2"],
  blouza: ["blouza", "blouza-oranaise", "oranaise", "3"],
  karakou: ["karakou", "karakous", "4"],
  hotesse: ["hotesse", "robes-d-hotesse", "hotesse-robe", "5"],
};

function matchesCategory(p: Product, selectedCategory: string): boolean {
  if (selectedCategory === "all") return true;

  const ext = p as unknown as Record<string, unknown>;
  const pCategory = String(p.category || ext.category_slug || "").toLowerCase().trim();
  const pId = String(ext.category_id || "").trim();
  const pNameAr = String(ext.category_name_ar || "").toLowerCase();

  const aliases = categoryAliases[selectedCategory] || [selectedCategory];

  return (
    aliases.includes(pCategory) ||
    aliases.includes(pId) ||
    aliases.some(alias => pCategory.includes(alias)) ||
    pNameAr.includes(selectedCategory)
  );
}

/** Resolve which category translation key a product belongs to (mirrors matchesCategory). */
function productCategoryKey(p: Product): Exclude<CatId, "all"> {
  const ext = p as unknown as Record<string, unknown>;
  const pCategory = String(p.category || ext.category_slug || "").toLowerCase().trim();
  const pId = String(ext.category_id || "").trim();
  const pNameAr = String(ext.category_name_ar || "").toLowerCase();

  for (const key of CATEGORY_IDS) {
    if (key === "all") continue;
    const aliases = categoryAliases[key] || [key];
    if (
      aliases.includes(pCategory) ||
      aliases.includes(pId) ||
      aliases.some(alias => pCategory.includes(alias)) ||
      pNameAr.includes(key)
    ) {
      return key;
    }
  }
  return "caftan";
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

function ShopContent() {
  const searchParams = useSearchParams();
  const initialCat = searchParams.get("cat") || searchParams.get("category");
  const { lang } = useLang();
  const tx = t(lang);

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CatId>(() => {
    if (initialCat && categoryAliases[initialCat]) return initialCat as CatId;
    return "all";
  });
  // DB slugs of categories visible on the storefront (admin can disable them).
  // null = not yet loaded → show everything to avoid a flash.
  const [activeSlugs, setActiveSlugs] = useState<string[] | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          setProducts(data.products || data);
        }
      } catch (e) {
        console.error("Failed to fetch products:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();

    // Which categories the admin has enabled on the storefront.
    fetch("/api/gallery-config")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return;
        const slugs = (data.categories || [])
          .filter((c: { is_active?: boolean }) => c.is_active)
          .map((c: { slug: string }) => c.slug);
        setActiveSlugs(slugs);
      })
      .catch(() => {});
  }, []);

  // Only the categories enabled by the admin are offered as filters.
  const visibleCatIds: CatId[] = !activeSlugs
    ? [...CATEGORY_IDS]
    : CATEGORY_IDS.filter(catId => {
        if (catId === "all") return true;
        return (categoryAliases[catId] || [catId]).some(a => activeSlugs.includes(a));
      });

  // If the selected filter got disabled, fall back to "all".
  const effectiveActive: CatId = visibleCatIds.includes(activeCategory) ? activeCategory : "all";

  // Hide products whose category was disabled by the admin.
  // p.category is the category slug (the products API maps category_slug → category).
  const visibleProducts = !activeSlugs
    ? products
    : products.filter(p => {
        const ext = p as unknown as Record<string, unknown>;
        const slug = String(p.category || ext.category_slug || "").trim();
        return activeSlugs.includes(slug);
      });

  // Filter products by selected category using robust alias matcher
  const filtered = visibleProducts.filter(p => matchesCategory(p, effectiveActive));


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
          <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-3">{tx.shop("title")}</h1>
          <p className="text-gray-600 max-w-2xl mx-auto text-sm sm:text-base">{tx.shop("subtitle")}</p>
        </motion.div>

        {/* Filters and Grid */}
        <div className="flex flex-col md:flex-row gap-6 sm:gap-8">

          {/* Sidebar Filters */}
          <motion.aside
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full md:w-56 lg:w-64 bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 md:sticky md:top-28 md:h-fit"
          >
            <div className="flex items-center gap-2 font-bold text-primary mb-4 sm:mb-6 border-b pb-3 sm:pb-4">
              <Filter className="w-5 h-5 text-accent" />
              {tx.shop("filter")}
            </div>

            <h3 className="font-bold mb-3 text-gray-800 text-sm sm:text-base">{tx.shop("filter")}</h3>

            {/* Mobile: horizontal pills */}
            <div className="flex flex-wrap gap-2 md:hidden">
              {visibleCatIds.map(catId => (
                <button
                  key={catId}
                  onClick={() => setActiveCategory(catId)}
                  className={`px-3 py-1 rounded-full border text-sm transition-all ${
                    effectiveActive === catId
                      ? "bg-accent text-primary border-accent font-bold shadow"
                      : "border-gray-300 text-gray-600 hover:bg-accent/20 hover:border-accent"
                  }`}
                >
                  {getCategoryLabel(catId, lang)}
                </button>
              ))}
            </div>

            {/* Desktop: list buttons */}
            <ul className="hidden md:block space-y-1">
              {visibleCatIds.map(catId => (
                <li key={catId}>
                  <button
                    onClick={() => setActiveCategory(catId)}
                    className={`w-full text-right px-3 py-2.5 rounded-xl text-sm transition-all flex items-center justify-between gap-2 ${
                      effectiveActive === catId
                        ? "bg-accent/20 text-primary font-bold border border-accent/30"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <span>{getCategoryLabel(catId, lang)}</span>
                    {effectiveActive === catId && (
                      <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {/* Active filter indicator */}
            {activeCategory !== "all" && (
              <button
                onClick={() => setActiveCategory("all")}
                className="mt-4 w-full text-xs text-center text-gray-400 hover:text-primary underline"
              >
                {getCategoryLabel("all", lang)}
              </button>
            )}
          </motion.aside>

          {/* Product Grid */}
          <div className="flex-1">
            {/* Count indicator */}
            {!loading && (
              <p className="text-sm text-gray-500 mb-4">
                {filtered.length > 0
                  ? `${filtered.length} ${tx.shop("items_found")}${effectiveActive !== "all" ? ` — ${getCategoryLabel(effectiveActive, lang)}` : ""}`
                  : ""}
              </p>
            )}

            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="bg-gray-100 rounded-xl animate-pulse h-80" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className="flex flex-col items-center justify-center py-24 text-center"
              >
                <div className="text-6xl mb-6">🪡</div>
                <h2 className="text-2xl font-bold text-primary mb-3">
                  {tx.shop("empty")}
                </h2>
                {effectiveActive !== "all" && (
                  <button
                    onClick={() => setActiveCategory("all")}
                    className="mt-6 inline-flex items-center gap-2 bg-accent text-primary px-6 py-2.5 rounded-full font-bold hover:bg-primary hover:text-accent transition-all duration-300"
                  >
                    {getCategoryLabel("all", lang)}
                  </button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key={activeCategory}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
              >
                {filtered.map((product, idx) => (
                  <motion.div key={product.id} variants={itemVariants}>
                    <Link
                      href={`/product/${product.id}`}
                      className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-50 block"
                    >
                      <div className="relative h-48 sm:h-64 md:h-80 lg:h-96 overflow-hidden">
                        <Image
                          src={product.images?.[0] || "/images/hero_caftan.webp"}
                          alt={product.name}
                          fill
                          unoptimized
                          priority={idx < 4}
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                          onError={() => {}}
                        />
                        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white/90 backdrop-blur text-primary text-xs font-bold px-2 sm:px-3 py-1 rounded-full shadow-sm">
                          {tx.cat(productCategoryKey(product))}
                        </div>
                      </div>
                      <div className="p-3 sm:p-6 text-center">
                        <h3 className="text-sm sm:text-xl font-bold text-primary mb-1 sm:mb-2 group-hover:text-accent transition-colors truncate">
                          {lang === "fr" ? (product.name_fr || product.name) : lang === "en" ? (product.name_en || product.name) : product.name}
                        </h3>
                        <p className="text-primary font-bold text-sm sm:text-lg">
                          {product.price.toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR")} {tx.common("currency")}
                        </p>
                        <span className="text-xs text-accent font-semibold">{tx.common("available")}</span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Shop() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}

