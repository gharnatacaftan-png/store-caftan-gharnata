"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ShieldCheck, Truck, Home, Building2, Receipt, X, ZoomIn, Loader2, ArrowLeft, ShoppingBag } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WILAYAS } from "@/lib/wilayas";
import { Product, getLocalizedField } from "@/lib/types";
import { useLang } from "@/hooks/useLang";
import { useCart } from "@/hooks/useCart";
import { t } from "@/lib/i18n";
import { fetchShippingRates } from "@/lib/shipping-rates-client";

export default function ProductDetail({ params }: { params: Promise<{ id: string }> }) {
  const { lang } = useLang();
  const { addItem, openCart } = useCart();
  const tx = t(lang);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedColor, setSelectedColor] = useState("");
  const [mainImage, setMainImage] = useState("");
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  // COD Form State
  const [deliveryType, setDeliveryType] = useState<"domicile" | "bureau">("domicile");
  const [selectedWilaya, setSelectedWilaya] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  // D1 shipping rates keyed by wilaya code — single source of truth. The
  // /api/orders route charges these same prices, so the client preview must
  // match exactly. WILAYAS is only a fallback while rates load.
  const [rates, setRates] = useState<Record<string, {
    price_home: number;
    price_desk: number;
    nameAr: string;
    nameFr: string;
    nameEn: string;
  }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    async function fetchProduct() {
      try {
        const resolvedParams = await params;
        const res = await fetch(`/api/products/${resolvedParams.id}`);
        if (!res.ok) throw new Error("Product not found");
        const data = await res.json();
        setProduct(data);
        const firstImg = data.primary_image || (data.images && data.images[0]) || "";
        if (firstImg) setMainImage(firstImg);
      } catch {
        setError(tx.product("not_found"));
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [params, tx]);

  useEffect(() => {
    fetchShippingRates().then(map => {
      const enriched: Record<string, {
        price_home: number;
        price_desk: number;
        nameAr: string;
        nameFr: string;
        nameEn: string;
      }> = {};
      for (const [code, r] of Object.entries(map)) {
        const staticWilaya = WILAYAS.find(w => w.code === code);
        enriched[code] = {
          price_home: r.price_home,
          price_desk: r.price_desk,
          nameAr: r.nameAr ?? staticWilaya?.nameAr ?? `${tx.shipping("wilaya")} ${code}`,
          nameFr: r.nameFr ?? staticWilaya?.name ?? `${tx.shipping("wilaya")} ${code}`,
          nameEn: r.nameEn ?? staticWilaya?.nameEn ?? staticWilaya?.name ?? `${tx.shipping("wilaya")} ${code}`,
        };
      }
      setRates(enriched);
    });
  }, [tx]);

  if (loading) {
    return (
      <div className="bg-background min-h-screen py-24 flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
        <p className="text-gray-500 font-semibold text-lg">{tx.product("loading")}</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bg-background min-h-screen py-24 flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full">
          <p className="text-red-500 font-bold text-xl mb-4">{error || tx.product("not_available")}</p>
          <a href="/shop" className="bg-[#D4AF37] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#c29c2d] transition-all inline-block">
            {tx.product("back_to_shop")}
          </a>
        </div>
      </div>
    );
  }

  // Derived values from product
  const productPrice = product?.price || 0;
  const sizes = product?.sizes?.length ? product.sizes : ["S", "M", "L", "XL", "XXL"];
  const colors = product?.colors?.length ? product.colors : [
    { id: "gold", name: "ذهبي", value: "#D4AF37" },
    { id: "white", name: "أبيض", value: "#F9F6F0" },
    { id: "black", name: "أسود ملكي", value: "#111111" },
  ];
  
  const thumbnailImages = Array.isArray(product?.images) ? product.images.filter(img => typeof img === "string" && img.trim() !== "") : [];
  const thumbnailVideos = Array.isArray(product?.videos) ? product.videos.filter(vid => typeof vid === "string" && vid.trim() !== "") : [];
  const rawMedia = [product?.primary_image, ...thumbnailImages, ...thumbnailVideos].filter(Boolean) as string[];
  const allMedia = Array.from(new Set(rawMedia));
  
  const activeMedia = (mainImage && mainImage.trim() !== "") ? mainImage : (allMedia[0] || "/images/hero_caftan.webp");
  const isVideoActive = activeMedia.match(/\.(mp4|webm|mov|mkv|avi|3gp|mpeg|wmv|m4v)$/i) || thumbnailVideos.includes(activeMedia);

  // Serve media straight from the Cloudflare R2 public CDN — no server-side
  // proxy hop. The old code routed every asset through /api/media, adding a
  // Next.js round-trip + a fresh S3 fetch per request, which is what made the
  // gallery take minutes to load. Stored URLs are already full R2 public URLs
  // (see products-db repairUrl); we only normalize legacy proxy paths here.
  const R2_PUBLIC_BASE = "https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev";

  function resolveMediaUrl(url: string): string {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    if (url.startsWith("/api/media/")) return `${R2_PUBLIC_BASE}/${url.slice("/api/media/".length)}`;
    if (url.startsWith("/api/stream/")) return `${R2_PUBLIC_BASE}/${url.slice("/api/stream/".length)}`;
    if (url.startsWith("/images/") || url.startsWith("/favicon")) return url;
    return `${R2_PUBLIC_BASE}/${url.replace(/^\/+/, "")}`;
  }

  function findLinkedMediaForColor(p: Product | null, colorObj: { id: string; name: string; value: string } | null): string | null {
    if (!p || !p.color_media_map || !colorObj) return null;
    const map = p.color_media_map;
    const availableMedia = new Set(allMedia.map(media => resolveMediaUrl(media).toLowerCase()));

    const keysToTry = [colorObj.id, colorObj.name, colorObj.value]
      .filter(Boolean)
      .map(key => String(key).toLowerCase());

    for (const [rawKey, rawList] of Object.entries(map)) {
      if (!keysToTry.includes(String(rawKey).toLowerCase()) || !Array.isArray(rawList)) continue;

      for (const rawMediaUrl of rawList) {
        const resolved = resolveMediaUrl(String(rawMediaUrl || ""));
        if (resolved && availableMedia.has(resolved.toLowerCase())) return resolved;
      }
    }

    return null;
  }

  function getShippingPrice(code: string, type: "domicile" | "bureau"): number {
    const d = rates[code];
    if (d) return type === "domicile" ? d.price_home : d.price_desk;
    const wilaya = WILAYAS.find(w => w.code === code);
    return wilaya ? (type === "domicile" ? wilaya.domicile : wilaya.bureau) : 0;
  }

  function handleWilayaChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const code = e.target.value;
    setSelectedWilaya(code);
    if (!code) { setDeliveryPrice(0); return; }
    setDeliveryPrice(getShippingPrice(code, deliveryType));
  }

  function handleDeliveryTypeChange(type: "domicile" | "bureau") {
    setDeliveryType(type);
    if (!selectedWilaya) return;
    setDeliveryPrice(getShippingPrice(selectedWilaya, type));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const phone = form.get("phone") as string;
    const commune = form.get("commune") as string;

    if (!product) { setFormError(tx.product("not_found")); return; }
    const productSizes = product.sizes || [];
    const productColors = product.colors || [];

    if (productSizes.length > 0 && !selectedSize) {
      setFormError(lang === "ar" ? "الرجاء اختيار المقاس قبل إرسال الطلب" : lang === "fr" ? "Veuillez choisir une taille avant de commander" : "Please select a size before ordering");
      return;
    }

    if (productColors.length > 0 && !selectedColor) {
      setFormError(lang === "ar" ? "الرجاء اختيار اللون قبل إرسال الطلب" : lang === "fr" ? "Veuillez choisir une couleur avant de commander" : "Please select a color before ordering");
      return;
    }

    if (!selectedWilaya) { setFormError(tx.common("select_wilaya_error")); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: Number(product.id),
          productName: product.name,
          category: product.category,
          selectedSize,
          selectedColor: colors.find(c => c.id === selectedColor)?.name || selectedColor,
          customerName: name,
          customerPhone: phone,
          wilayaCode: Number(selectedWilaya),
          commune,
          shippingType: deliveryType === "bureau" ? "DESK" : "HOME",
          deliveryType,
          customer: { name, phone, wilaya: selectedWilaya, commune },
          productPrice,
          lang,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setOrderId(data.orderId);
        setDeliveryPrice(data.deliveryPrice);
        setSubmitted(true);
      } else {
        setFormError(data.error || tx.common("order_error"));
      }
    } catch {
      setFormError(tx.common("server_error"));
    } finally {
      setSubmitting(false);
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    setMousePos({ x: ((e.clientX - left) / width) * 100, y: ((e.clientY - top) / height) * 100 });
  };

  // Add the current product (with the selected size/color) to the cart and open
  // the drawer so the customer sees the result immediately.
  function handleAddToCart() {
    if (!product) return;
    const productSizes = product.sizes || [];
    const productColors = product.colors || [];

    if (productSizes.length > 0 && !selectedSize) {
      const msg = lang === "ar" ? "الرجاء اختيار المقاس أولاً" : lang === "fr" ? "Veuillez choisir une taille" : "Please select a size";
      setFormError(msg);
      alert(msg);
      return;
    }

    if (productColors.length > 0 && !selectedColor) {
      const msg = lang === "ar" ? "الرجاء اختيار اللون أولاً" : lang === "fr" ? "Veuillez choisir une couleur" : "Please select a color";
      setFormError(msg);
      alert(msg);
      return;
    }

    addItem({
      productId: Number(product.id),
      name: product.name,
      name_fr: product.name_fr,
      name_en: product.name_en,
      price: product.price,
      image: resolveMediaUrl(product.primary_image || thumbnailImages[0] || ""),
      size: selectedSize,
      color: colors.find(c => c.id === selectedColor)?.name || selectedColor,
    });
    openCart();
  }

  return (
    <div className="bg-background min-h-screen py-8 sm:py-12 overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">

          {/* Gallery Section */}
          <motion.div initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
            className="p-4 sm:p-8 bg-gray-50 flex flex-col items-center">
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}
              className="relative w-full h-72 sm:h-[400px] md:h-[500px] rounded-xl sm:rounded-2xl overflow-hidden shadow-lg mb-4 sm:mb-6 cursor-pointer group bg-black flex items-center justify-center"
              onClick={() => setIsZoomed(true)}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onMouseMove={handleMouseMove}>
              
              {isVideoActive ? (
                <video
                  src={resolveMediaUrl(activeMedia)}
                  className="w-full h-full object-contain pointer-events-none"
                  poster={resolveMediaUrl(product?.primary_image || thumbnailImages[0] || "")}
                  autoPlay muted loop playsInline preload="metadata"
                />
              ) : (
                <Image src={resolveMediaUrl(activeMedia)} alt={product.name || "قفطان غرناطة"} fill unoptimized priority fetchPriority="high" loading="eager"
                  className={`object-cover transition-transform ${isHovering ? "scale-[2] duration-0" : "scale-100 duration-500"}`}
                  style={{ transformOrigin: isHovering ? `${mousePos.x}% ${mousePos.y}%` : "center center" }} />
              )}
              
              {!isHovering && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center pointer-events-none">
                  <div className="bg-white/80 backdrop-blur p-3 rounded-full shadow-xl">
                    <ZoomIn className="w-6 h-6 text-primary" />
                  </div>
                </div>
              )}
            </motion.div>

            {allMedia.length > 1 && (
              <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.4 }}
                className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 w-full justify-center">
                {allMedia.map((media, index) => {
                  const isVid = media.match(/\.(mp4|webm|mov|mkv|avi|3gp|mpeg|wmv|m4v)$/i) || thumbnailVideos.includes(media);
                  const mediaUrl = resolveMediaUrl(media);
                  return (
                    <button key={index} onClick={() => setMainImage(media)}
                      className={`relative w-16 h-20 sm:w-24 sm:h-32 rounded-lg overflow-hidden border-2 transition-all shrink-0 bg-black ${activeMedia === media ? "border-[#D4AF37] shadow-md scale-105" : "border-transparent opacity-70 hover:opacity-100"}`}>
                      {isVid ? (
                        <video src={`${mediaUrl}#t=0.1`} className="w-full h-full object-cover pointer-events-none" muted playsInline preload="metadata" />
                      ) : (
                        <Image src={mediaUrl} alt={`Thumbnail ${index}`} fill unoptimized loading="lazy" decoding="async" className="object-cover" />
                      )}
                      {isVid && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center">
                            <div className="w-0 h-0 border-t-4 border-t-transparent border-l-[6px] border-l-black border-b-4 border-b-transparent ml-0.5" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </motion.div>

          {/* Details & Form Section */}
          <motion.div initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="p-5 sm:p-8 lg:p-12 flex flex-col justify-center">
            <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2">
              {getLocalizedField(lang, product.name, product.name_fr, product.name_en)}
            </motion.h1>
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}
              className="text-2xl sm:text-3xl font-bold text-accent mb-4 sm:mb-6">
              {productPrice.toLocaleString()} {tx.common("currency")}
            </motion.div>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}
              className="text-gray-600 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base">
              {getLocalizedField(lang, product.description || tx.product("description"), product.description_fr, product.description_en)}
            </motion.p>

            {/* Sizes */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.6 }}
              className="mb-5 sm:mb-6">
              <h3 className="font-bold text-primary mb-2 sm:mb-3 text-sm sm:text-base">{tx.product("choose_size")}:</h3>
              <div className="flex gap-2 sm:gap-3 flex-wrap">
                {sizes.map(size => (
                  <button key={size} onClick={() => setSelectedSize(selectedSize === size ? "" : size)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full text-sm sm:text-base font-bold transition-all ${selectedSize === size ? "bg-primary text-white shadow-lg scale-110 ring-2 ring-primary/40" : "bg-gray-100 text-primary hover:bg-gray-200"}`}>
                    {size}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Colors */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.7 }}
              className="mb-6 sm:mb-8">
              <h3 className="font-bold text-primary mb-2 sm:mb-3 text-sm sm:text-base">{tx.product("choose_color")}:</h3>
              <div className="flex gap-3 sm:gap-4">
                {colors.map(color => {
                  const isLight = color.id === "white" || color.value?.toLowerCase() === "#ffffff" || color.value?.toLowerCase() === "white" || (color.name && color.name.toLowerCase().includes("blanc"));
                  return (
                    <button key={color.id} onClick={() => {
                      const nextColorId = selectedColor === color.id ? "" : color.id;
                      setSelectedColor(nextColorId);
                      if (nextColorId) {
                        const targetMedia = findLinkedMediaForColor(product, color);
                        if (targetMedia) setMainImage(resolveMediaUrl(targetMedia));
                      }
                    }}
                      className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 transition-all relative ${selectedColor === color.id ? "border-accent shadow-lg scale-110 ring-2 ring-accent/60" : "border-gray-200 hover:scale-105"}`}
                      style={{ backgroundColor: color.value }} title={color.name}>
                      {selectedColor === color.id && <Check className={`absolute inset-0 m-auto w-4 h-4 sm:w-5 sm:h-5 ${isLight ? "text-black" : "text-white"}`} />}
                    </button>
                  );
                })}
              </div>
            </motion.div>

            {/* Add to Cart */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.8 }}
              className="mb-6 sm:mb-8">
              <button
                onClick={handleAddToCart}
                className="w-full flex items-center justify-center gap-2 bg-primary text-accent border-2 border-accent/50 font-bold text-base sm:text-lg py-3 rounded-xl shadow-lg hover:bg-accent hover:text-primary transition-all duration-300 group"
              >
                <ShoppingBag className="w-5 h-5 group-hover:scale-110 transition-transform" />
                {tx.shop("add_to_cart")}
              </button>
            </motion.div>

            <hr className="mb-6 sm:mb-8 border-gray-100" />

            {/* COD Form */}
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.9 }}
              className="bg-background p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-lg sm:text-2xl font-bold text-primary mb-4 sm:mb-6 flex items-center gap-2">
                <Truck className="text-accent w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                {tx.product("cod_order")}
              </h3>

              {/* Order Success — luxury brand confirmation */}
              <AnimatePresence mode="wait">
                {submitted && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.92, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 260, damping: 22 }}
                    className="relative overflow-hidden bg-card border-2 border-accent/40 rounded-2xl p-6 sm:p-8 text-center shadow-xl shadow-accent/10"
                  >
                    {/* soft gold sheen */}
                    <div className="absolute inset-0 bg-gradient-to-b from-accent/8 via-transparent to-transparent pointer-events-none" />

                    <div className="relative">
                      {/* Animated gold check */}
                      <div className="relative w-20 h-20 mx-auto mb-5">
                        <motion.span
                          className="absolute inset-0 rounded-full bg-accent/25"
                          animate={{ scale: [1, 1.35], opacity: [0.5, 0] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                        />
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.15, type: "spring", stiffness: 300, damping: 16 }}
                          className="relative w-20 h-20 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/40"
                        >
                          <Check className="w-10 h-10 text-[#0b0b10]" strokeWidth={3.5} />
                        </motion.div>
                      </div>

                      <motion.h4
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="text-2xl font-bold text-primary mb-1"
                      >
                        {tx.product("order_confirmed")}
                      </motion.h4>
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.35 }}
                        className="text-gray-500 text-sm mb-5"
                      >
                        {tx.product("order_contact")}
                      </motion.p>

                      {/* Order ID badge */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-full px-4 py-1.5 mb-5"
                      >
                        <Receipt className="w-4 h-4 text-accent" />
                        <span className="text-gray-600 text-xs font-semibold">{tx.product("order_id")}:</span>
                        <span className="font-mono font-bold text-primary" dir="ltr">#{orderId}</span>
                      </motion.div>

                      {/* Invoice summary */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55 }}
                        className="bg-background border border-gray-100 rounded-xl p-4 text-sm text-gray-700 space-y-1.5"
                      >
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-500 font-medium">{product.name}</span>
                          <span className="shrink-0">
                            {selectedSize && <span className="text-gray-500">{tx.common("size")}: <b className="text-primary">{selectedSize}</b></span>}
                            {selectedColor && colors.find(c => c.id === selectedColor)?.name && (
                              <span className="text-gray-500 mx-2">· <b className="text-primary">{colors.find(c => c.id === selectedColor)?.name}</b></span>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{tx.product("product_price")}</span>
                          <b className="text-primary">{productPrice.toLocaleString()} {tx.common("currency")}</b>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">{tx.product("shipping_fee")}</span>
                          <b className="text-primary">{deliveryPrice.toLocaleString()} {tx.common("currency")}</b>
                        </div>
                        <div className="flex justify-between border-t border-accent/25 pt-2 mt-1">
                          <span className="font-bold text-primary">{tx.product("total_amount")}</span>
                          <span className="font-bold text-accent text-base">{(productPrice + deliveryPrice).toLocaleString()} {tx.common("currency")}</span>
                        </div>
                      </motion.div>

                      {/* Continue shopping */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.7 }}
                        className="mt-6"
                      >
                        <Link
                          href="/shop"
                          className="inline-flex items-center gap-2 text-accent font-bold hover:text-primary transition-colors text-sm group"
                        >
                          {tx.common("all")}
                          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        </Link>
                      </motion.div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {!submitted && (
                <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                  {/* Name & Phone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">{tx.product("full_name")}</label>
                      <input name="name" type="text" required
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-sm sm:text-base"
                        placeholder={tx.product("name_placeholder")} />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">{tx.product("phone")}</label>
                      <input name="phone" type="tel" required pattern="^0[567][0-9]{8}$"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-left text-sm sm:text-base"
                        dir="ltr" placeholder="05XX XX XX XX" />
                    </div>
                  </div>

                  {/* Wilaya & Commune */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">{tx.product("select_wilaya")}</label>
                      <select required value={selectedWilaya} onChange={handleWilayaChange}
                        className="w-full px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-xs sm:text-sm bg-white">
                        <option value="">{tx.product("select_wilaya")}</option>
                        {WILAYAS.map(w => {
                          const rate = rates[w.code];
                          let displayName = w.nameAr;
                          if (rate) {
                            displayName = lang === "ar" ? rate.nameAr : lang === "fr" ? rate.nameFr : rate.nameEn;
                          }
                          return <option key={w.code} value={w.code}>{w.code} — {displayName}</option>;
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">{tx.product("commune")}</label>
                      <input name="commune" type="text" required
                        className="w-full px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-xs sm:text-base"
                        placeholder={tx.product("commune_placeholder")} />
                    </div>
                  </div>

                  {/* Delivery Type Buttons */}
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">{tx.product("delivery_type")}</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => handleDeliveryTypeChange("domicile")}
                        className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all ${deliveryType === "domicile"
                          ? "border-accent bg-accent/5 text-primary"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}>
                        <Home className={`w-5 h-5 sm:w-6 sm:h-6 ${deliveryType === "domicile" ? "text-accent" : "text-gray-400"}`} />
                        <span className="text-xs sm:text-sm font-bold">{tx.product("home_delivery")}</span>
                        <span className="text-xs text-gray-400">{tx.product("à_domicile")}</span>
                      </button>
                      <button type="button" onClick={() => handleDeliveryTypeChange("bureau")}
                        className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all ${deliveryType === "bureau"
                          ? "border-accent bg-accent/5 text-primary"
                          : "border-gray-200 text-gray-500 hover:border-gray-300"
                          }`}>
                        <Building2 className={`w-5 h-5 sm:w-6 sm:h-6 ${deliveryType === "bureau" ? "text-accent" : "text-gray-400"}`} />
                        <span className="text-xs sm:text-sm font-bold">{tx.product("bureau_delivery")}</span>
                        <span className="text-xs text-gray-400">Stop Desk</span>
                      </button>
                    </div>
                  </div>

                  {/* Invoice */}
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, delay: 1 }}
                    className="bg-white p-4 sm:p-5 rounded-xl border-2 border-dashed border-gray-300 mt-2 space-y-2 sm:space-y-3">
                    <div className="flex items-center gap-2 text-primary font-bold mb-1 sm:mb-2 text-sm sm:text-base">
                      <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                      {tx.product("invoice")}
                    </div>
                    <div className="flex justify-between items-center text-gray-600 text-sm sm:text-base">
                      <span>{tx.product("product_price")}:</span>
                      <span className="font-bold">{productPrice.toLocaleString()} {tx.common("currency")}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-600 text-sm sm:text-base">
                      <span>{tx.product("shipping_fee")}:</span>
                      <span className={`font-bold ${deliveryPrice === 0 ? "text-gray-400" : "text-primary"}`}>
                        {deliveryPrice === 0 ? tx.product("select_wilaya") : `${deliveryPrice.toLocaleString()} ${tx.common("currency")}`}
                      </span>
                    </div>
                    <div className="border-t-2 border-dashed border-gray-200 pt-2 sm:pt-3 flex justify-between items-center text-primary font-bold text-base sm:text-xl">
                      <span>{tx.product("total_amount")}:</span>
                      <span className="text-accent">{deliveryPrice === 0 ? "—" : `${(productPrice + deliveryPrice).toLocaleString()} ${tx.common("currency")}`}</span>
                    </div>
                  </motion.div>

                  {formError && (
                    <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">⚠️ {formError}</p>
                  )}

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit" disabled={submitting || !selectedWilaya}
                    className="w-full mt-4 bg-accent text-primary font-bold text-base sm:text-xl py-3 sm:py-4 rounded-xl shadow-lg hover:bg-[#c29c2d] hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="group-hover:scale-110 transition-transform w-5 h-5 sm:w-6 sm:h-6" />}
                    {submitting ? tx.product("sending") : tx.product("confirm_order")}
                  </motion.button>
                </form>
              )}
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 sm:p-8 cursor-zoom-out backdrop-blur-sm"
            onClick={() => setIsZoomed(false)}>
            <button className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-2 sm:p-3 rounded-full transition-all"
              onClick={e => { e.stopPropagation(); setIsZoomed(false); }}>
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl h-[85vh] flex items-center justify-center overflow-hidden rounded-2xl" onClick={e => e.stopPropagation()}>
              {isVideoActive ? (
                <video src={resolveMediaUrl(activeMedia)} className="w-full h-full object-contain" autoPlay muted loop playsInline preload="metadata" controls />
              ) : (
                <Image src={resolveMediaUrl(activeMedia)} alt="Zoomed Product" fill unoptimized priority loading="eager" className="object-contain" quality={100} />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
