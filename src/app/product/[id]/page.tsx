"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ShieldCheck, Truck, Receipt, X, ZoomIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ProductDetail() {
  const [selectedSize, setSelectedSize] = useState("M");
  const [selectedColor, setSelectedColor] = useState("gold");
  const [mainImage, setMainImage] = useState("/images/category_bridal.png");
  const [deliveryPrice, setDeliveryPrice] = useState(600);
  const [isZoomed, setIsZoomed] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);

  const productPrice = 45000;
  const sizes = ["S", "M", "L", "XL", "XXL"];
  const colors = [
    { id: "gold", name: "ذهبي", value: "#D4AF37" },
    { id: "white", name: "أبيض", value: "#F9F6F0" },
    { id: "black", name: "أسود ملكي", value: "#111111" },
  ];
  const thumbnails = [
    "/images/category_bridal.png",
    "/images/category_tasdira.png",
    "/images/category_modern.png",
  ];

  const handleWilayaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDeliveryPrice(val === "16" ? 400 : val ? 600 : 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("تم تأكيد الطلب بنجاح! سنتواصل معك قريباً.");
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - left) / width) * 100;
    const y = ((e.clientY - top) / height) * 100;
    setMousePos({ x, y });
  };

  return (
    <div className="bg-background min-h-screen py-8 sm:py-12 overflow-hidden">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden grid grid-cols-1 lg:grid-cols-2">

          {/* Gallery Section */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="p-4 sm:p-8 bg-gray-50 flex flex-col items-center"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative w-full h-72 sm:h-[400px] md:h-[500px] rounded-xl sm:rounded-2xl overflow-hidden shadow-lg mb-4 sm:mb-6 cursor-crosshair group"
              onClick={() => setIsZoomed(true)}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              onMouseMove={handleMouseMove}
            >
              <Image 
                src={mainImage} 
                alt="قفطان الملكة" 
                fill 
                className={`object-cover transition-transform ${isHovering ? "scale-[2] duration-0" : "scale-100 duration-500"}`}
                style={{ transformOrigin: isHovering ? `${mousePos.x}% ${mousePos.y}%` : "center center" }}
              />
              {!isHovering && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="bg-white/80 backdrop-blur p-3 rounded-full shadow-xl">
                    <ZoomIn className="w-6 h-6 text-primary" />
                  </div>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 w-full justify-center"
            >
              {thumbnails.map((thumb, index) => (
                <button
                  key={index}
                  onClick={() => setMainImage(thumb)}
                  className={`relative w-16 h-20 sm:w-24 sm:h-32 rounded-lg overflow-hidden border-2 transition-all shrink-0 ${mainImage === thumb ? "border-accent shadow-md scale-105" : "border-transparent opacity-70 hover:opacity-100"}`}
                >
                  <Image src={thumb} alt={`Thumbnail ${index}`} fill className="object-cover" />
                </button>
              ))}
            </motion.div>
          </motion.div>

          {/* Details & Form Section */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="p-5 sm:p-8 lg:p-12 flex flex-col justify-center"
          >
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2"
            >
              قفطان الملكة
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="text-2xl sm:text-3xl font-bold text-accent mb-4 sm:mb-6"
            >
              {productPrice.toLocaleString()} د.ج
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="text-gray-600 mb-6 sm:mb-8 leading-relaxed text-sm sm:text-base"
            >
              قطعة فنية فريدة تعكس عراقة التصميم الجزائري. مصنوع من أجود أنواع القطيفة الملكية مع تطريز يدوي دقيق بخيوط الذهب الخالص (المجبود).
            </motion.p>

            {/* Sizes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="mb-5 sm:mb-6"
            >
              <h3 className="font-bold text-primary mb-2 sm:mb-3 text-sm sm:text-base">اختر المقاس:</h3>
              <div className="flex gap-2 sm:gap-3 flex-wrap">
                {sizes.map(size => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full text-sm sm:text-base font-bold transition-all ${selectedSize === size ? "bg-primary text-white shadow-lg scale-110" : "bg-gray-100 text-primary hover:bg-gray-200"}`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Colors */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.7 }}
              className="mb-6 sm:mb-10"
            >
              <h3 className="font-bold text-primary mb-2 sm:mb-3 text-sm sm:text-base">اختر اللون:</h3>
              <div className="flex gap-3 sm:gap-4">
                {colors.map(color => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color.id)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 transition-all relative ${selectedColor === color.id ? "border-accent shadow-lg scale-110" : "border-gray-200"}`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  >
                    {selectedColor === color.id && <Check className={`absolute inset-0 m-auto w-4 h-4 sm:w-5 sm:h-5 ${color.id === "white" ? "text-black" : "text-white"}`} />}
                  </button>
                ))}
              </div>
            </motion.div>

            <hr className="mb-6 sm:mb-8 border-gray-100" />

            {/* COD Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.9 }}
              className="bg-background p-4 sm:p-6 rounded-2xl border border-gray-100 shadow-sm"
            >
              <h3 className="text-lg sm:text-2xl font-bold text-primary mb-4 sm:mb-6 flex items-center gap-2">
                <Truck className="text-accent w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                الطلب السريع (الدفع عند الاستلام)
              </h3>

              <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">الاسم واللقب</label>
                  <input type="text" required className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-sm sm:text-base" placeholder="أدخل اسمك الكامل" />
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">رقم الهاتف</label>
                  <input type="tel" required pattern="^(0)(5|6|7)[0-9]{8}$" className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-left text-sm sm:text-base" dir="ltr" placeholder="05XX XX XX XX" />
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">الولاية</label>
                    <select required onChange={handleWilayaChange} className="w-full px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-xs sm:text-base">
                      <option value="">اختر الولاية</option>
                      <option value="16">16 - الجزائر</option>
                      <option value="31">31 - وهران</option>
                      <option value="25">25 - قسنطينة</option>
                      <option value="09">09 - البليدة</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-1">البلدية</label>
                    <input type="text" required className="w-full px-2 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-xs sm:text-base" placeholder="البلدية" />
                  </div>
                </div>

                {/* Mini Ticket */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 1 }}
                  className="bg-white p-4 sm:p-5 rounded-xl border-2 border-dashed border-gray-300 mt-2 space-y-2 sm:space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center gap-2 text-primary font-bold mb-1 sm:mb-2 text-sm sm:text-base">
                    <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                    تفاصيل الفاتورة
                  </div>
                  <div className="flex justify-between items-center text-gray-600 text-sm sm:text-base">
                    <span>سعر المنتج:</span>
                    <span className="font-bold">{productPrice.toLocaleString()} د.ج</span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 text-sm sm:text-base">
                    <span>مصاريف التوصيل:</span>
                    <span className="font-bold">{deliveryPrice.toLocaleString()} د.ج</span>
                  </div>
                  <div className="border-t-2 border-dashed border-gray-200 pt-2 sm:pt-3 flex justify-between items-center text-primary font-bold text-base sm:text-xl">
                    <span>المجموع الإجمالي:</span>
                    <span className="text-accent">{(productPrice + deliveryPrice).toLocaleString()} د.ج</span>
                  </div>
                </motion.div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="w-full mt-4 bg-accent text-primary font-bold text-base sm:text-xl py-3 sm:py-4 rounded-xl shadow-lg hover:bg-[#c29c2d] hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2 group"
                >
                  <ShieldCheck className="group-hover:scale-110 transition-transform w-5 h-5 sm:w-6 sm:h-6" />
                  تأكيد الطلب
                </motion.button>
              </form>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 sm:p-8 cursor-zoom-out backdrop-blur-sm"
            onClick={() => setIsZoomed(false)}
          >
            <button 
              className="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 p-2 sm:p-3 rounded-full transition-all"
              onClick={(e) => { e.stopPropagation(); setIsZoomed(false); }}
            >
              <X className="w-6 h-6 sm:w-8 sm:h-8" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-5xl h-[85vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image 
                src={mainImage} 
                alt="Zoomed Product" 
                fill 
                className="object-contain" 
                quality={100}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
