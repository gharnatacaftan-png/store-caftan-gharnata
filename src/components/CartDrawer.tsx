"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Plus, Minus, Trash2, ShoppingBag, Truck, Home, Building2, Check, Loader2, ShieldCheck, Receipt } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/hooks/useCart";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { WILAYAS } from "@/lib/wilayas";
import { getLocalizedField } from "@/lib/types";
import { fetchShippingRates } from "@/lib/shipping-rates-client";

export default function CartDrawer() {
  const { lines, isOpen, closeCart, updateQty, removeItem, clearCart, subtotal, count } = useCart();
  const { lang, dir } = useLang();
  const tx = t(lang);

  const [deliveryType, setDeliveryType] = useState<"domicile" | "bureau">("domicile");
  const [selectedWilaya, setSelectedWilaya] = useState("");
  const [deliveryPrice, setDeliveryPrice] = useState(0);
  const [rates, setRates] = useState<Record<string, { price_home: number; price_desk: number; nameAr?: string; nameFr?: string; nameEn?: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [formError, setFormError] = useState("");

  // Lock body scroll while the drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isOpen]);

  useEffect(() => {
    fetchShippingRates().then(map => setRates(map));
  }, []);

  // Nom de la wilaya dans la langue courante : D1 d'abord, secours statique.
  function wilayaDisplayName(code: string): string {
    const rate = rates[code];
    const staticWilaya = WILAYAS.find(w => w.code === code);
    if (lang === "ar") return rate?.nameAr || staticWilaya?.nameAr || code;
    if (lang === "fr") return rate?.nameFr || staticWilaya?.name || rate?.nameAr || code;
    return rate?.nameEn || rate?.nameFr || staticWilaya?.nameEn || staticWilaya?.name || rate?.nameAr || code;
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

  async function handleCheckout(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError("");
    const form = new FormData(e.currentTarget);
    const name = form.get("name") as string;
    const phone = form.get("phone") as string;
    const commune = form.get("commune") as string;

    if (!selectedWilaya) { setFormError(tx.common("select_wilaya_error")); return; }
    if (lines.length === 0) { setFormError(tx.shop("cart_empty")); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: lines.map(l => ({
            productId: l.productId,
            size: l.size,
            color: l.color,
            quantity: l.quantity,
          })),
          customerName: name,
          customerPhone: phone,
          wilayaCode: Number(selectedWilaya),
          commune,
          shippingType: deliveryType === "bureau" ? "DESK" : "HOME",
          deliveryType,
          customer: { name, phone, wilaya: selectedWilaya, commune },
          lang,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setOrderId(String(data.orderId));
        setDeliveryPrice(data.deliveryPrice);
        clearCart();
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

  const total = subtotal + (selectedWilaya ? deliveryPrice : 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
            onClick={closeCart}
          />

          {/* Panel */}
            <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.35, ease: "easeInOut" }}
            className="fixed top-0 right-0 bottom-0 z-[95] w-full sm:max-w-sm md:max-w-md bg-white shadow-2xl flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
            dir={dir}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-primary text-white">
              <h2 className="flex items-center gap-2 font-bold text-lg">
                <ShoppingBag className="w-5 h-5 text-accent" />
                {tx.shop("cart")}
                {count > 0 && (
                  <span className="bg-accent text-primary text-xs font-bold rounded-full px-2 py-0.5">{count}</span>
                )}
              </h2>
              <button onClick={closeCart} className="p-2 hover:text-accent transition-colors" aria-label="Close">
                <X className="w-6 h-6" />
              </button>
            </div>

            {submitted ? (
              /* ── Success ─────────────────────────────────────────── */
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
                <div className="relative w-20 h-20 mb-5">
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
                <h3 className="text-2xl font-bold text-primary mb-2">{tx.shop("order_placed")}</h3>
                <p className="text-gray-500 text-sm mb-4">{tx.product("order_contact")}</p>
                <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/30 rounded-full px-4 py-1.5 mb-6">
                  <Receipt className="w-4 h-4 text-accent" />
                  <span className="text-gray-600 text-xs font-semibold">{tx.product("order_id")}:</span>
                  <span className="font-mono font-bold text-primary" dir="ltr">#{orderId}</span>
                </div>
                <button
                  onClick={() => { setSubmitted(false); setSelectedWilaya(""); setDeliveryPrice(0); closeCart(); }}
                  className="bg-accent text-primary px-6 py-2.5 rounded-xl font-bold hover:bg-primary hover:text-accent transition-colors"
                >
                  {tx.shop("cart_continue")}
                </button>
              </div>
            ) : lines.length === 0 ? (
              /* ── Empty ───────────────────────────────────────────── */
              <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center">
                <div className="text-6xl mb-6">🛍️</div>
                <h3 className="text-xl font-bold text-primary mb-2">{tx.shop("cart_empty")}</h3>
                <Link href="/shop" onClick={closeCart}
                  className="mt-6 inline-flex items-center gap-2 bg-accent text-primary px-6 py-2.5 rounded-full font-bold hover:bg-primary hover:text-accent transition-all">
                  {tx.shop("cart_continue")}
                </Link>
              </div>
            ) : (
              <>
                {/* ── Line items ────────────────────────────────────── */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {lines.map((line) => (
                    <div key={line.key} className="flex gap-3 border border-gray-100 rounded-2xl p-3">
                      <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-gray-100 shrink-0">
                        {line.image ? (
                          <Image src={line.image} alt={line.name} fill unoptimized sizes="64px" className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">🧵</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-primary text-sm leading-snug line-clamp-2">
                            {getLocalizedField(lang, line.name, line.name_fr, line.name_en)}
                          </p>
                          <button onClick={() => removeItem(line.key)} className="p-1 text-gray-400 hover:text-red-500 transition-colors shrink-0" aria-label={tx.shop("remove")}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {tx.common("size")}: <b>{line.size}</b>
                          {line.color && <><span className="mx-1">·</span>{tx.common("color")}: <b>{line.color}</b></>}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center border border-gray-200 rounded-lg">
                          <button onClick={() => updateQty(line.key, line.quantity - 1)} className="p-2 sm:p-2.5 text-gray-500 hover:text-accent" aria-label="−"><Minus className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                          <span className="w-9 sm:w-10 text-center text-sm font-bold text-primary">{line.quantity}</span>
                          <button onClick={() => updateQty(line.key, line.quantity + 1)} className="p-2 sm:p-2.5 text-gray-500 hover:text-accent" aria-label="+"><Plus className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                        </div>
                          <span className="font-bold text-accent text-sm">
                            {(line.price * line.quantity).toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR")} {tx.common("currency")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button onClick={clearCart} className="w-full text-center text-xs text-gray-400 hover:text-red-500 underline transition-colors">
                    {tx.shop("clear_cart")}
                  </button>
                </div>

                {/* ── Checkout ──────────────────────────────────────── */}
                <form onSubmit={handleCheckout} className="border-t border-gray-100 p-5 space-y-3 bg-gray-50/60">
                  {/* Subtotal */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">{tx.shop("subtotal")}</span>
                    <span className="font-bold text-primary text-lg">{subtotal.toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR")} {tx.common("currency")}</span>
                  </div>

                  <p className="text-xs text-gray-500">{tx.shop("checkout_info")}</p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input name="name" type="text" required placeholder={tx.product("name_placeholder")}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-sm" />
                    <input name="phone" type="tel" required pattern="^0[567][0-9]{8}$" dir="ltr" placeholder="05XX XX XX XX"
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-sm text-left" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <select required value={selectedWilaya} onChange={handleWilayaChange}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-sm bg-white">
                      <option value="">{tx.product("select_wilaya")}</option>
                      {WILAYAS.map(w => (
                        <option key={w.code} value={w.code}>{w.code} — {wilayaDisplayName(w.code)}</option>
                      ))}
                    </select>
                    <input name="commune" type="text" required placeholder={tx.product("commune_placeholder")}
                      className="w-full px-3 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-sm" />
                  </div>

                  {/* Delivery type */}
                   <div className="grid grid-cols-2 gap-3">
                     <button type="button" onClick={() => handleDeliveryTypeChange("domicile")}
                       className={`flex flex-col items-center gap-1 p-3 sm:p-3.5 rounded-xl border-2 transition-all text-xs sm:text-sm font-bold ${deliveryType === "domicile" ? "border-accent bg-accent/5 text-primary" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                       <Home className={`w-5 h-5 sm:w-6 sm:h-6 ${deliveryType === "domicile" ? "text-accent" : "text-gray-400"}`} />
                       {tx.product("home_delivery")}
                     </button>
                     <button type="button" onClick={() => handleDeliveryTypeChange("bureau")}
                       className={`flex flex-col items-center gap-1 p-3 sm:p-3.5 rounded-xl border-2 transition-all text-xs sm:text-sm font-bold ${deliveryType === "bureau" ? "border-accent bg-accent/5 text-primary" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                       <Building2 className={`w-5 h-5 sm:w-6 sm:h-6 ${deliveryType === "bureau" ? "text-accent" : "text-gray-400"}`} />
                       {tx.product("bureau_delivery")}
                     </button>
                   </div>

                  {/* Totals */}
                  <div className="bg-white border border-gray-100 rounded-xl p-3 text-sm space-y-1.5">
                    <div className="flex justify-between text-gray-600">
                      <span>{tx.product("shipping_fee")}:</span>
                      <span className={`font-bold ${deliveryPrice === 0 ? "text-gray-400" : "text-primary"}`}>
                        {deliveryPrice === 0 ? tx.product("select_wilaya") : `${deliveryPrice.toLocaleString()} ${tx.common("currency")}`}
                      </span>
                    </div>
                    <div className="flex justify-between items-center font-bold text-primary border-t border-dashed border-gray-200 pt-2">
                      <span>{tx.product("total_amount")}:</span>
                      <span className="text-accent">{deliveryPrice === 0 ? "—" : `${total.toLocaleString()} ${tx.common("currency")}`}</span>
                    </div>
                  </div>

                  {formError && (
                    <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">⚠️ {formError}</p>
                  )}

                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    type="submit" disabled={submitting || !selectedWilaya}
                    className="w-full flex items-center justify-center gap-2 bg-accent text-primary font-bold text-base py-3 rounded-xl shadow-lg hover:bg-primary hover:text-accent transition-all disabled:opacity-60 disabled:cursor-not-allowed">
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    {submitting ? tx.product("sending") : tx.shop("checkout")}
                  </motion.button>
                  <p className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
                    <Truck className="w-3.5 h-3.5" /> {tx.common("cod_payment")}
                  </p>
                </form>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
