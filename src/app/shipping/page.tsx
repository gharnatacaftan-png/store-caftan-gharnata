"use client";

import { useEffect, useMemo, useState } from "react";
import { Truck, RotateCcw, ShieldCheck, Clock, MapPin, Search, Loader2, Banknote } from "lucide-react";
import { motion } from "framer-motion";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { WILAYAS } from "@/lib/wilayas";
import { fetchShippingRates } from "@/lib/shipping-rates-client";

// Tarif tel que renvoyé par /api/shipping-rates (table D1 shipping_rates) —
// la même source que /api/orders utilise pour facturer la commande : ce que
// le client voit ici est exactement ce qui sera appliqué au checkout.
interface RateRow {
  code: string;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  price_home: number;
  price_desk: number;
  deliverable: boolean;
}

export default function Shipping() {
  const { lang, dir } = useLang();
  const tx = t(lang);

  const [rates, setRates] = useState<RateRow[]>([]);
  const [loadingRates, setLoadingRates] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchShippingRates().then(map => {
      const rows: RateRow[] = [];
      for (const [code, r] of Object.entries(map)) {
        const staticWilaya = WILAYAS.find(w => w.code === code);
        rows.push({
          code,
          nameAr: r.nameAr ?? staticWilaya?.nameAr ?? `${tx.shipping("wilaya")} ${code}`,
          nameFr: r.nameFr ?? staticWilaya?.name ?? `${tx.shipping("wilaya")} ${code}`,
          nameEn: r.nameEn ?? staticWilaya?.nameEn ?? staticWilaya?.name ?? `${tx.shipping("wilaya")} ${code}`,
          price_home: r.price_home,
          price_desk: r.price_desk,
          deliverable: r.deliverable ?? true,
        });
      }
      rows.sort((a, b) => a.code.localeCompare(b.code));
      setRates(rows);
    }).finally(() => setLoadingRates(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function localizedName(row: RateRow): string {
    if (lang === "ar") return row.nameAr;
    if (lang === "fr") return row.nameFr || row.nameAr;
    return row.nameEn || row.nameFr || row.nameAr;
  }

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rates;
    return rates.filter(r =>
      r.code.includes(s) ||
      r.nameAr.includes(search.trim()) ||
      r.nameFr.toLowerCase().includes(s) ||
      r.nameEn.toLowerCase().includes(s)
    );
  }, [rates, search]);

  const fmt = (n: number) => n.toLocaleString(lang === "ar" ? "ar-DZ" : "fr-FR");

  return (
    <div className="bg-background min-h-screen py-10 sm:py-16" dir={dir}>
      <div className="container mx-auto px-4 max-w-4xl">

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10 sm:mb-16"
        >
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-primary mb-3 sm:mb-4">{tx.shipping("title")}</h1>
          <p className="text-sm sm:text-lg text-gray-600 px-2">{tx.shipping("subtitle")}</p>
        </motion.div>

        <div className="space-y-6 sm:space-y-12">

          {/* Shipping Policy */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6 }}
            className="bg-white p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-20 sm:w-32 h-20 sm:h-32 bg-accent/10 rounded-bl-full -z-10"></div>

            <h2 className="text-xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8 flex items-center gap-3">
              <Truck className="text-accent w-7 h-7 sm:w-10 sm:h-10 shrink-0" />
              {tx.nav("shipping")}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="flex gap-3 sm:gap-4 items-start"
              >
                <div className="bg-primary/5 p-2 sm:p-3 rounded-xl text-primary shrink-0">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-xl mb-1 sm:mb-2">{tx.shipping("coverage")}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{tx.shipping("coverage_desc")}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex gap-3 sm:gap-4 items-start"
              >
                <div className="bg-primary/5 p-2 sm:p-3 rounded-xl text-primary shrink-0">
                  <Clock className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-xl mb-1 sm:mb-2">{tx.shipping("timeline")}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{tx.shipping("timeline_desc")}</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex gap-3 sm:gap-4 items-start"
              >
                <div className="bg-primary/5 p-2 sm:p-3 rounded-xl text-primary shrink-0">
                  <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-xl mb-1 sm:mb-2">{tx.shipping("cod")}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm sm:text-base">{tx.shipping("cod_desc")}</p>
                </div>
              </motion.div>
            </div>
          </motion.section>

          {/* Delivery rates by wilaya — same D1 table that /api/orders bills from */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-20 sm:w-32 h-20 sm:h-32 bg-accent/10 rounded-br-full -z-10"></div>

            <h2 className="text-xl sm:text-3xl font-bold text-primary mb-3 sm:mb-4 flex items-center gap-3">
              <ShieldCheck className="text-accent w-7 h-7 sm:w-9 sm:h-9 shrink-0" />
              {tx.shipping("wilaya_rates")}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 mb-5">{tx.shipping("rates_note")}</p>

            {/* Search */}
            <div className="relative mb-4">
              <Search className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 ${dir === "rtl" ? "left-3" : "right-3"}`} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={tx.shipping("rates_search")}
                className={`w-full px-4 py-2.5 rounded-xl border border-neutral-300 focus:outline-none focus:ring-4 focus:ring-accent/20 focus:border-accent transition-all text-sm bg-white ${dir === "rtl" ? "pr-4 pl-10" : "pl-4 pr-10"}`}
              />
            </div>

            {loadingRates ? (
              <div className="flex items-center justify-center gap-2 py-10 text-gray-500">
                <Loader2 className="w-5 h-5 animate-spin text-accent" />
                <span className="text-sm">{tx.shipping("rates_loading")}</span>
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-gray-400 py-10 text-sm">{tx.shipping("rates_empty")}</p>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[60px_1fr_1fr_1fr] bg-primary text-white text-[11px] sm:text-xs font-bold uppercase tracking-wide">
                  <span className="hidden sm:block px-2 sm:px-3 py-3 text-center">#</span>
                  <span className="px-2 sm:px-3 py-3">{tx.shipping("wilaya")}</span>
                  <span className="px-2 sm:px-3 py-3 text-center">{tx.shipping("home_delivery")}</span>
                  <span className="px-2 sm:px-3 py-3 text-center">{tx.shipping("bureau")}</span>
                </div>
                {/* Rows */}
                <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
                  {filtered.map(row => (
                    <div key={row.code} className="grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[60px_1fr_1fr_1fr] items-center text-xs sm:text-sm hover:bg-accent/5 transition-colors">
                      <span className="hidden sm:block px-2 sm:px-3 py-2.5 text-center text-gray-400 font-mono text-xs" dir="ltr">{row.code}</span>
                      <span className="px-2 sm:px-3 py-2.5 font-semibold text-primary">{localizedName(row)}</span>
                      <span className="px-2 sm:px-3 py-2.5 text-center text-gray-700 whitespace-nowrap">
                        {row.deliverable ? <>{fmt(row.price_home)} <span className="text-gray-400 text-xs">{tx.common("currency")}</span></> : "—"}
                      </span>
                      <span className="px-2 sm:px-3 py-2.5 text-center text-gray-700 whitespace-nowrap">
                        {row.deliverable ? <>{fmt(row.price_desk)} <span className="text-gray-400 text-xs">{tx.common("currency")}</span></> : "—"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.section>

          {/* Returns Policy */}
          <motion.section
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="bg-white p-6 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-20 sm:w-32 h-20 sm:h-32 bg-primary/5 rounded-br-full -z-10"></div>

            <h2 className="text-xl sm:text-3xl font-bold text-primary mb-6 sm:mb-8 flex items-center gap-3">
              <RotateCcw className="text-accent w-7 h-7 sm:w-10 sm:h-10 shrink-0" />
              {tx.shipping("return_policy")}
            </h2>

            <div className="space-y-4 sm:space-y-6 text-gray-600 leading-relaxed">
              <p className="text-sm sm:text-lg">{tx.shipping("return_desc")}</p>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="bg-accent/10 border-r-4 border-accent p-3 sm:p-4 rounded-l-xl mt-4 sm:mt-8"
              >
                <p className="text-primary font-bold text-sm sm:text-base">{tx.shipping("contact")}:</p>
                <p className="text-xs sm:text-sm mt-1">{tx.shipping("contact_desc")}</p>
              </motion.div>
            </div>
          </motion.section>

        </div>
      </div>
    </div>
  );
}
