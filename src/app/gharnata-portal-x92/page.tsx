import { dbGetOrderStats } from "@/lib/orders-db";
import { dbGetAllProducts } from "@/lib/products-db";
import { dbGetStorageOverview, formatBytes } from "@/lib/storage-db";
import { ShoppingBag, Package, Truck, TrendingUp, Clock, CheckCircle2, HardDrive, Database, Settings } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession } from "./actions";
import { getAdminLang } from "@/lib/admin-lang";
import { t } from "@/lib/i18n";

import RefreshButton from "@/components/admin/RefreshButton";

export default async function AdminDashboard() {
  // Defense-in-depth: verify the session server-side too (the proxy also guards
  // this route). Expired sessions are rejected here, not just at the edge.
  const session = await getAdminSession();
  if (!session.isAdmin) redirect("/gharnata-portal-x92/login");

  const lang = await getAdminLang();
  const tx = t(lang);
  const locale = lang === "ar" ? "ar-DZ" : "en-US";
  const currency = tx.common("currency");

  const orderStats = await dbGetOrderStats();
  const products = await dbGetAllProducts(false);
  const storage = await dbGetStorageOverview();

  // Storage status: gold for OK/warning, red only for a genuinely full bucket.
  const r2Color = storage.r2.status === "danger"
    ? { bar: "bg-red-500", badge: "text-red-400 border-red-500/20 bg-red-500/10" }
    : { bar: "bg-[#D4AF37]", badge: "text-[#D4AF37] border-[#D4AF37]/20 bg-[#D4AF37]/10" };

  const kpis = [
    {
      label: tx.admin("new_orders"),
      value: orderStats.newOrders,
      icon: Clock,
      color: "text-[#D4AF37]",
      bg: "bg-[#D4AF37]/10",
      border: "border-[#D4AF37]/20",
      href: "/gharnata-portal-x92/orders",
    },
    {
      label: tx.admin("today_orders"),
      value: orderStats.todayOrders,
      icon: ShoppingBag,
      color: "text-[#D4AF37]",
      bg: "bg-[#D4AF37]/10",
      border: "border-[#D4AF37]/20",
      href: "/gharnata-portal-x92/orders",
    },
    {
      label: tx.admin("in_shipping"),
      value: orderStats.inShipping,
      icon: Truck,
      color: "text-[#D4AF37]",
      bg: "bg-[#D4AF37]/10",
      border: "border-[#D4AF37]/20",
      href: "/gharnata-portal-x92/orders",
    },
    {
      label: tx.admin("total_orders"),
      value: orderStats.total,
      icon: CheckCircle2,
      color: "text-[#D4AF37]",
      bg: "bg-[#D4AF37]/10",
      border: "border-[#D4AF37]/20",
      href: "/gharnata-portal-x92/orders",
    },
  ];

  const quickLinks = [
    { href: "/gharnata-portal-x92/orders",   label: tx.admin("manage_orders"),   icon: ShoppingBag, desc: `${orderStats.newOrders} ${tx.admin("new_order_suffix")}` },
    { href: "/gharnata-portal-x92/products", label: tx.admin("manage_products"), icon: Package,     desc: `${products.length} ${tx.admin("items_added_suffix")}` },
    { href: "/gharnata-portal-x92/shipping", label: tx.admin("shipping_rates"),  icon: Truck,       desc: tx.admin("wilayas_suffix") },
    { href: "/gharnata-portal-x92/settings", label: tx.admin("store_settings"),  icon: Settings,    desc: tx.admin("phone_links_suffix") },
  ];

  return (
    <div className="p-6 lg:p-10" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-white">{tx.admin("overview")}</h1>
          <p className="text-gray-500 mt-1">{tx.admin("welcome")}</p>
        </div>
        <RefreshButton />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {kpis.map(kpi => (
          <Link
            key={kpi.label}
            href={kpi.href}
            className={`${kpi.bg} ${kpi.border} border rounded-2xl p-5 hover:scale-[1.02] transition-transform block`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} border ${kpi.border} flex items-center justify-center`}>
                <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-white mb-1">{kpi.value.toLocaleString(locale)}</p>
            <p className="text-gray-400 text-sm">{kpi.label}</p>
          </Link>
        ))}
      </div>

      {/* Revenue Card */}
      <div className="bg-gradient-to-br from-[#D4AF37]/10 to-[#D4AF37]/5 border border-[#D4AF37]/20 rounded-2xl p-6 mb-10 flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{tx.admin("total_sales")}</p>
          <p className="text-4xl font-bold text-[#D4AF37]">
            {orderStats.totalRevenue.toLocaleString(locale)} <span className="text-2xl">{currency}</span>
          </p>
        </div>
        <TrendingUp className="w-12 h-12 text-[#D4AF37]/30" />
      </div>

      {/* Storage Trackers — R2 & D1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        {/* R2 */}
        <div className="block rounded-2xl border border-white/5 bg-[#111118] p-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <HardDrive className="h-5 w-5 text-[#D4AF37]" />
              <div>
                <p className="font-semibold text-white text-sm">{tx.admin("r2_storage")}</p>
                <p className="text-xs text-gray-500">{formatBytes(storage.r2.usedBytes)} {tx.admin("of")} {storage.r2.limitGb} GB</p>
              </div>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-bold ${r2Color.badge}`}>
              {storage.r2.usedGb.toFixed(2)} GB
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#1a1a24]">
            <div className={`h-full ${r2Color.bar}`} style={{ width: `${Math.max(0.5, storage.r2.percent)}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-600">{tx.admin("remaining")}: <span className="text-[#D4AF37] font-semibold">{storage.r2.freeGb.toFixed(2)} GB</span></p>
        </div>

        {/* D1 */}
        <div className="block rounded-2xl border border-white/5 bg-[#111118] p-6">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Database className="h-5 w-5 text-[#D4AF37]" />
              <div>
                <p className="font-semibold text-white text-sm">{tx.admin("d1_database")}</p>
                <p className="text-xs text-gray-500">{storage.d1.totalRows.toLocaleString(locale)} {tx.admin("records")} · {storage.d1.usedMb.toFixed(1)} MB {tx.admin("estimate")}</p>
              </div>
            </div>
            <span className="rounded-full border px-3 py-1 text-xs font-bold text-[#D4AF37] border-[#D4AF37]/20 bg-[#D4AF37]/10">
              {storage.d1.freeGb.toFixed(2)} GB {tx.admin("remaining")}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[#1a1a24]">
            <div className="h-full bg-[#D4AF37]" style={{ width: `${Math.max(0.5, storage.d1.percent)}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-600">
            {tx.admin("orders")}: <span className="text-white font-semibold">{storage.d1.ordersCount}</span>
            <span className="mx-1">·</span>
            {tx.admin("products")}: <span className="text-white font-semibold">{storage.d1.productsCount}</span>
            <span className="mx-1">·</span>
            {tx.admin("media")}: <span className="text-white font-semibold">{storage.d1.mediaCount}</span>
          </p>
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickLinks.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-[#111118] border border-white/5 rounded-2xl p-5 hover:border-[#D4AF37]/30 hover:bg-[#1a1a24] transition-all group"
          >
            <item.icon className="w-7 h-7 text-[#D4AF37]/60 group-hover:text-[#D4AF37] mb-3 transition-colors" />
            <p className="text-white font-semibold mb-1">{item.label}</p>
            <p className="text-gray-500 text-sm">{item.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
