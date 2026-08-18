"use client";
import { useState, useEffect } from "react";
import { Search, Download, Trash2, Eye, Printer, X, User, Package, ExternalLink, Truck } from "lucide-react";
import QRCode from "qrcode";
import ConfirmModal from "@/components/admin/ConfirmModal";
import RefreshButton from "@/components/admin/RefreshButton";
import { useLang } from "@/hooks/useLang";
import { t, type Lang } from "@/lib/i18n";
import { socialLinksLine, getActivePhones, getActiveAddresses } from "@/lib/social-links";
import { csrfHeaders } from "@/lib/client-csrf";
import { formatDate, formatTime } from "@/lib/time";

export type OrderStatus = "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED";

// One product line of an order (multi-item cart orders).
export interface OrderLine {
  id: number;
  product_id: number;
  title: string | null;
  selected_size: string | null;
  selected_color: string | null;
  quantity: number;
  unit_price: number;
}

export interface OrderItem {
  id: number;
  customer_name: string;
  customer_phone: string;
  wilaya_code: number;
  wilaya_name?: string;
  wilaya_name_fr?: string | null;
  wilaya_name_en?: string | null;
  commune: string;
  shipping_type: "HOME" | "DESK";
  product_id: number;
  product_title?: string;
  selected_size: string | null;
  selected_color: string | null;
  product_price: number;
  shipping_cost: number;
  total_price: number;
  status: OrderStatus;
  lang: string | null;
  notes: string | null;
  created_at: string;
  items?: OrderLine[];
}

// Which printable document is currently armed for printing.
type PrintTarget = "order" | "delivery" | null;

// Lines to render on a slip — from the order's items when present, otherwise a
// single synthetic line rebuilt from the legacy header columns.
function orderLines(o: OrderItem): OrderLine[] {
  if (o.items && o.items.length > 0) return o.items;
  return [{
    id: 0,
    product_id: o.product_id,
    title: o.product_title ?? null,
    selected_size: o.selected_size,
    selected_color: o.selected_color,
    quantity: 1,
    unit_price: o.product_price,
  }];
}

const STATUS_FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"];

// Network hiccups (flaky WiFi, aborted requests while reconnecting) must never
// crash the orders page. Swallow fetch failures and return null instead.
async function safeJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

// The bon de commande is printed in the language the customer used when
// ordering. Older orders (before the lang column) fall back to Arabic.
function orderLang(o: { lang?: string | null } | null): Lang {
  const l = o?.lang;
  return l === "fr" || l === "en" ? l : "ar";
}

interface StoreSettings {
  phone1: string;
  phone2: string;
  phone3: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
  tiktok: string;
  x_link: string;
  location_url: string;
  instagram_enabled: boolean;
  facebook_enabled: boolean;
  tiktok_enabled: boolean;
  x_enabled: boolean;
  location_enabled: boolean;
  phone1_enabled: boolean;
  phone2_enabled: boolean;
  phone3_enabled: boolean;
  address1: string;
  address2: string;
  address3: string;
  address1_enabled: boolean;
  address2_enabled: boolean;
  address3_enabled: boolean;
}

const DEFAULT_SETTINGS: StoreSettings = {
  phone1: "0561234567",
  phone2: "0671234567",
  phone3: "",
  whatsapp: "213561234567",
  instagram: "https://instagram.com/caftan_granada",
  facebook: "",
  tiktok: "",
  x_link: "",
  location_url: "",
  instagram_enabled: true,
  facebook_enabled: true,
  tiktok_enabled: true,
  x_enabled: true,
  location_enabled: true,
  phone1_enabled: true,
  phone2_enabled: true,
  phone3_enabled: true,
  address1: "",
  address2: "",
  address3: "",
  address1_enabled: true,
  address2_enabled: true,
  address3_enabled: true,
};

export default function OrdersClient({ initialOrders }: { initialOrders: OrderItem[] }) {
  const { lang, dir } = useLang();
  const tx = t(lang);
  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US";

  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [printTarget, setPrintTarget] = useState<PrintTarget>(null);

  // Black + gold theme: gold badges for all active statuses (solid gold for the
  // completed one), red only for the cancelled state.
  const STATUS_LABELS: Record<OrderStatus, { label: string; color: string; bg: string }> = {
    PENDING:   { label: tx.admin("st_pending"),   color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/10" },
    CONFIRMED: { label: tx.admin("st_confirmed"), color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/10" },
    SHIPPED:   { label: tx.admin("st_shipped"),   color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/10" },
    DELIVERED: { label: tx.admin("st_delivered"), color: "text-black",     bg: "bg-[#D4AF37]" },
    CANCELLED: { label: tx.admin("st_cancelled"), color: "text-red-400",   bg: "bg-red-400/10" },
  };

  // Load store contact info for the printed slip (falls back to defaults).
  useEffect(() => {
    let cancelled = false;
    safeJson<StoreSettings>("/api/settings").then(s => { if (s && !cancelled) setSettings(s); });
    return () => { cancelled = true; };
  }, []);

  // Generate the QR code (points to the public /bon/{id} page showing the same
  // slip, in the customer's language).
  useEffect(() => {
    if (!selectedOrder) return;
    let cancelled = false;
    const target = `${window.location.origin}/bon/${selectedOrder.id}?lang=${orderLang(selectedOrder)}`;
    QRCode.toDataURL(target, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then(u => { if (!cancelled) setQrUrl(u); })
      .catch(() => { if (!cancelled) setQrUrl(""); });
    return () => { cancelled = true; };
  }, [selectedOrder]);

  const filtered = orders.filter(o => {
    const s = search.toLowerCase();
    const matchSearch = !search || o.customer_name.toLowerCase().includes(s) || o.customer_phone.includes(s) || o.id.toString().includes(s) || (o.product_title?.toLowerCase().includes(s));
    return matchSearch && (statusFilter === "all" || o.status === statusFilter);
  });

  async function doDelete(orderId: number) {
    const res = await safeJson<{ ok: boolean }>(`/api/admin/orders?id=${orderId}`, {
      method: "DELETE",
      headers: await csrfHeaders(),
    });
    if (res) {
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setSelectedIds(prev => prev.filter(i => i !== orderId));
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
    }
  }

  function toggleSelect(id: number) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }

  function toggleSelectAll() {
    const visible = filtered.map(o => o.id);
    const allSelected = visible.length > 0 && visible.every(id => selectedIds.includes(id));
    setSelectedIds(prev => allSelected ? prev.filter(i => !visible.includes(i)) : Array.from(new Set([...prev, ...visible])));
  }

  async function doBulkDelete() {
    const ids = [...selectedIds];
    setBulkDeleteOpen(false);
    if (ids.length === 0) return;
    const res = await safeJson<{ ok: boolean }>(`/api/admin/orders?ids=${ids.join(",")}`, {
      method: "DELETE",
      headers: await csrfHeaders(),
    });
    if (res) {
      setOrders(prev => prev.filter(o => !ids.includes(o.id)));
      setSelectedIds([]);
      if (selectedOrder && ids.includes(selectedOrder.id)) setSelectedOrder(null);
    }
  }

  // Arm the printable document ("bon de commande" or bilingual "bon de
  // livraison"), let React render it, then trigger the browser print dialog.
  // A double requestAnimationFrame fires after the new DOM has been committed
  // AND painted — much more reliable than a fixed timeout (which was too short
  // on slow machines and produced a blank/slow printout).
  function handlePrint(target: "order" | "delivery") {
    if (!selectedOrder) return;
    setPrintTarget(target);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  function handleExportCSV() {
    const headers = [
      "ID", tx.admin("name"), tx.admin("phone"), tx.admin("wilaya"), tx.admin("commune"),
      tx.admin("product"), tx.admin("size"), tx.admin("color"), tx.admin("delivery_type"),
      tx.admin("product_price"), tx.admin("shipping_cost"), tx.admin("total"),
      tx.admin("status"), tx.admin("date"),
    ];
    const rows = filtered.map(o => [
      o.id, o.customer_name, o.customer_phone,
      o.wilaya_name || o.wilaya_code, o.commune,
      o.product_title || o.product_id,
      o.selected_size || "—", o.selected_color || "—",
      o.shipping_type === "HOME" ? tx.admin("home_delivery") : tx.admin("office_pickup"),
      o.product_price, o.shipping_cost, o.total_price,
      STATUS_LABELS[o.status]?.label || o.status,
      formatDate(o.created_at, locale),
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: `orders_${new Date().toISOString().slice(0,10)}.csv` });
    a.click();
  }

  function fmtDate(iso: string) {
    return formatDate(iso, locale);
  }
  function fmtTime(iso: string) {
    return formatTime(iso, locale);
  }
  function fmtPrice(n: number) {
    return n.toLocaleString(locale);
  }

  const slipSettings = settings || DEFAULT_SETTINGS;
  // Active social networks / location for the printed slips — same source of
  // truth as the storefront footer (dashboard settings toggles).
  const slipSocials = socialLinksLine(slipSettings);
  const slipPhones = getActivePhones(slipSettings);
  const slipPhonesLine = (slipPhones.length ? slipPhones : [slipSettings.phone1]).join(" · ");
  const slipAddressesLine = getActiveAddresses(slipSettings).map(a => a.text).join(" · ");

  // The printed slip uses the CUSTOMER's language (not the admin's current
  // language), so the bon de commande handed to the delivery agent matches the
  // language the client ordered in.
  const slipLang: Lang = selectedOrder ? orderLang(selectedOrder) : lang;
  const slipTx = t(slipLang);
  const slipLocale = slipLang === "ar" ? "ar-DZ" : slipLang === "fr" ? "fr-FR" : "en-US";
  // Fixed translators for the always-bilingual "bon de livraison" (FR + AR side
  // by side, independent of the admin's or customer's language).
  const frT = t("fr");
  const arT = t("ar");

  function slipDate(iso: string) {
    return formatDate(iso, slipLocale);
  }
  function slipTime(iso: string) {
    return formatTime(iso, slipLocale);
  }
  function slipPrice(n: number) {
    return n.toLocaleString(slipLocale);
  }

  return (
    <div className="p-6 lg:p-10" dir={dir}>
      {/* Print styles — only the slip is visible when printing */}
      <style global jsx>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-slip, #print-slip *, #print-delivery-slip, #print-delivery-slip * { visibility: visible !important; }
          #print-slip, #print-delivery-slip {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            padding: 22px !important;
            margin: 0 !important;
            background: #ffffff !important;
            color: #000000 !important;
            z-index: 99999 !important;
            font-family: 'Segoe UI', Tahoma, sans-serif !important;
            box-shadow: none !important;
          }
          #print-slip .slip-no-break, #print-delivery-slip .slip-no-break { break-inside: avoid; }
        }
        @page { size: A4; margin: 10mm; }
      `}</style>

      {/* Custom confirm modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title={tx.admin("delete_order_title")}
        message={`${tx.admin("delete_order_confirm")} #${deleteId}? ${tx.admin("delete_note")}`}
        confirmLabel={tx.admin("delete_order_confirm")}
        variant="danger"
        onConfirm={() => deleteId && doDelete(deleteId)}
        onClose={() => setDeleteId(null)}
      />

      {/* Bulk delete confirm modal — selection-based */}
      <ConfirmModal
        isOpen={bulkDeleteOpen}
        title={tx.admin("delete_selected_title")}
        message={`${tx.admin("delete_selected_confirm").replace("{n}", String(selectedIds.length))} ${tx.admin("delete_note")}`}
        confirmLabel={tx.admin("delete_selected")}
        variant="danger"
        onConfirm={doBulkDelete}
        onClose={() => setBulkDeleteOpen(false)}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-white">{tx.admin("orders")}</h1>
          <p className="text-gray-500 mt-1">{orders.length} {tx.admin("order_unit")} {tx.admin("orders_in_db")}</p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton
            onRefresh={async () => {
              const data = await safeJson<{ orders: OrderItem[] }>("/api/admin/orders");
              if (data?.orders) setOrders(data.orders);
            }}
          />
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-[#D4AF37] text-black px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#c29c2d] transition-all"
          >
            <Download className="w-4 h-4" />
            {tx.admin("export_csv")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 print:hidden">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tx.admin("search_placeholder")}
            className="w-full bg-[#111118] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as OrderStatus | "all")}
          className="bg-[#111118] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
        >
          <option value="all">{tx.admin("all_statuses")}</option>
          {STATUS_FLOW.map(s => <option key={s} value={s}>{STATUS_LABELS[s].label}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-600 print:hidden">
          <p className="text-5xl mb-4">📭</p>
          <p className="text-lg">{tx.admin("no_orders")}</p>
        </div>
      ) : (
        <>
        {/* Selection toolbar — select all + bulk delete */}
        <div className="flex items-center justify-between gap-3 mb-3 print:hidden">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filtered.length > 0 && filtered.every(o => selectedIds.includes(o.id))}
              onChange={toggleSelectAll}
              className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
            />
            <span className="text-sm text-gray-400">{tx.admin("select_all_orders")}</span>
            <span className="text-xs text-gray-600">
              {tx.admin("selected_count").replace("{n}", String(selectedIds.length))}
            </span>
          </label>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setBulkDeleteOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="w-4 h-4" />
              {tx.admin("delete_selected")}
            </button>
          )}
        </div>

        <div className="space-y-3 print:hidden">
          {filtered.map(order => {
            const sc = STATUS_LABELS[order.status] || STATUS_LABELS.PENDING;
            return (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className="bg-[#111118] border border-white/5 rounded-2xl p-5 hover:border-[#D4AF37]/40 hover:bg-[#151520] transition-all cursor-pointer group"
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      onClick={e => e.stopPropagation()}
                      className="mt-1 w-4 h-4 accent-[#D4AF37] cursor-pointer shrink-0"
                    />
                    <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[#D4AF37] font-mono text-xs bg-[#D4AF37]/10 px-2 py-1 rounded-lg font-bold">#{order.id}</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${sc.bg} ${sc.color}`}>{sc.label}</span>
                      <span className="text-xs text-gray-600">{fmtDate(order.created_at)}</span>
                    </div>
                    <p className="text-white font-semibold group-hover:text-[#D4AF37] transition-colors">
                      {order.customer_name}
                      <span className="text-gray-400 font-normal text-sm mx-2" dir="ltr">{order.customer_phone}</span>
                    </p>
                    <p className="text-gray-400 text-sm">
                      {order.product_title || tx.admin("product_ref").replace("{id}", String(order.product_id))}
                      {order.selected_size && <span className="mx-1">· {tx.admin("size")}: {order.selected_size}</span>}
                      {order.selected_color && <span className="mx-1">· {tx.admin("color")}: {order.selected_color}</span>}
                      <span className="mx-1">· {order.wilaya_name || tx.admin("wilaya_ref").replace("{code}", String(order.wilaya_code))}</span>
                    </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-[#D4AF37]/15 text-gray-300 hover:text-[#D4AF37] text-xs font-semibold transition-all"
                    >
                      <Eye className="w-4 h-4" />
                      {tx.admin("details")}
                    </button>
                    <button
                      onClick={() => setDeleteId(order.id)}
                      className="p-2 rounded-xl text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      title={tx.admin("delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </>
      )}

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" dir={dir} onClick={() => setSelectedOrder(null)}>
          <div
            className="bg-[#111118] border border-white/10 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-[#111118]/95 backdrop-blur border-b border-white/5 px-6 py-4 flex items-center justify-between gap-3 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-white font-bold">#{selectedOrder.id}</p>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${STATUS_LABELS[selectedOrder.status]?.bg} ${STATUS_LABELS[selectedOrder.status]?.color}`}>
                    {STATUS_LABELS[selectedOrder.status]?.label}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer info */}
              <section>
                <h3 className="flex items-center gap-2 text-[#D4AF37] font-bold text-sm mb-3 uppercase tracking-wide">
                  <User className="w-4 h-4" /> {tx.admin("customer_info")}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#0e0e16] border border-white/5 rounded-2xl p-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{tx.admin("name")}</p>
                    <p className="text-white font-semibold text-sm">{selectedOrder.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{tx.admin("phone")}</p>
                    <p className="text-white font-semibold text-sm" dir="ltr">{selectedOrder.customer_phone}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{tx.admin("wilaya_commune")}</p>
                    <p className="text-white font-semibold text-sm">
                      {selectedOrder.wilaya_name || tx.admin("wilaya_ref").replace("{code}", String(selectedOrder.wilaya_code))}
                      <span className="text-gray-400 font-normal"> · {selectedOrder.commune}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">{tx.admin("delivery_method")}</p>
                    <p className="text-white font-semibold text-sm">
                      {selectedOrder.shipping_type === "HOME" ? tx.admin("home_delivery") : tx.admin("office_pickup")}
                    </p>
                  </div>
                </div>
              </section>

              {/* Product info */}
              <section>
                <h3 className="flex items-center gap-2 text-[#D4AF37] font-bold text-sm mb-3 uppercase tracking-wide">
                  <Package className="w-4 h-4" /> {tx.admin("order_details")}
                </h3>
                <div className="bg-[#0e0e16] border border-white/5 rounded-2xl overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b border-white/5">
                        <td className="px-4 py-3 text-gray-500 text-xs w-32">{tx.admin("product")}</td>
                        <td className="px-4 py-3 text-white font-semibold">
                          {selectedOrder.product_title || tx.admin("product_ref").replace("{id}", String(selectedOrder.product_id))}
                          <span className="text-gray-500 text-xs font-normal" dir="ltr"> · #{selectedOrder.product_id}</span>
                        </td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="px-4 py-3 text-gray-500 text-xs">{tx.admin("size")}</td>
                        <td className="px-4 py-3 text-white font-semibold">{selectedOrder.selected_size || "—"}</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="px-4 py-3 text-gray-500 text-xs">{tx.admin("color")}</td>
                        <td className="px-4 py-3 text-white font-semibold">{selectedOrder.selected_color || "—"}</td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="px-4 py-3 text-gray-500 text-xs">{tx.admin("quantity")}</td>
                        <td className="px-4 py-3 text-white font-semibold">
                          {orderLines(selectedOrder).reduce((sum, l) => sum + l.quantity, 0)}
                          {orderLines(selectedOrder).length > 1 && (
                            <span className="text-gray-500 text-xs font-normal"> · {orderLines(selectedOrder).length} {tx.admin("order_unit")}(s)</span>
                          )}
                        </td>
                      </tr>
                      <tr className="border-b border-white/5">
                        <td className="px-4 py-3 text-gray-500 text-xs">{tx.admin("date")}</td>
                        <td className="px-4 py-3 text-white font-semibold">{fmtDate(selectedOrder.created_at)} · {fmtTime(selectedOrder.created_at)}</td>
                      </tr>
                      {selectedOrder.notes && (
                        <tr>
                          <td className="px-4 py-3 text-gray-500 text-xs">{tx.admin("notes")}</td>
                          <td className="px-4 py-3 text-white font-semibold">{selectedOrder.notes}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Prices */}
              <section className="bg-gradient-to-l from-[#D4AF37]/10 to-transparent border border-[#D4AF37]/20 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{tx.admin("product_price")}</span>
                  <span className="text-white font-semibold">{fmtPrice(selectedOrder.product_price)} {tx.common("currency")}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">{tx.admin("shipping_cost")}</span>
                  <span className="text-white font-semibold">{fmtPrice(selectedOrder.shipping_cost)} {tx.common("currency")}</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#D4AF37]/20 pt-2">
                  <span className="text-[#D4AF37] font-bold">{tx.admin("total_due")}</span>
                  <span className="text-[#D4AF37] font-bold text-lg">{fmtPrice(selectedOrder.total_price)} {tx.common("currency")}</span>
                </div>
              </section>

              {/* QR + actions */}
              <section className="flex flex-col sm:flex-row items-center gap-5 bg-[#0e0e16] border border-white/5 rounded-2xl p-5">
                <div className="flex flex-col items-center gap-2 shrink-0">
                  {qrUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={qrUrl} alt="QR" className="w-24 h-24 rounded-lg border border-white/10 bg-white p-1" />
                  ) : (
                    <div className="w-24 h-24 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-600 text-xs">{tx.common("loading")}</div>
                  )}
                  <span className="text-[10px] text-gray-500 text-center max-w-[120px] leading-tight">{tx.admin("scan_qr_hint")}</span>
                </div>
                <div className="flex-1 text-sm text-gray-400 leading-relaxed">
                  <p className="text-white font-semibold mb-1">{tx.admin("view_slip")}</p>
                  <p className="mb-4">{tx.admin("scan_qr_hint")} — <span className="text-[#D4AF37] font-mono" dir="ltr">/bon/{selectedOrder.id}?lang={slipLang}</span></p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => window.open(`/bon/${selectedOrder.id}?lang=${slipLang}`, "_blank")}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {tx.admin("view_full_slip")}
                    </button>
                    <button
                      onClick={() => handlePrint("order")}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#D4AF37] text-black text-xs font-bold transition-all hover:bg-[#c29c2d]"
                    >
                      <Printer className="w-4 h-4" />
                      {tx.admin("print_slip")}
                    </button>
                    <button
                      onClick={() => handlePrint("delivery")}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-[#D4AF37]/15 text-[#D4AF37] text-xs font-bold transition-all"
                    >
                      <Truck className="w-4 h-4" />
                      {tx.admin("print_delivery_slip")}
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Printable bon de commande — sibling of the modal, only rendered when the order slip is armed for printing. Rendered in the CUSTOMER's language (slipTx), not the admin's. */}
      {selectedOrder && printTarget === "order" && (
        <div id="print-slip" className="hidden print:block" dir={slipLang === "ar" ? "rtl" : "ltr"}>
          <div className="slip-no-break" style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
            {/* Store header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid #D4AF37", paddingBottom: 12, marginBottom: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="logo" style={{ width: 64, height: 64, objectFit: "contain" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>
                  {slipTx.admin("brand")} <span style={{ color: "#D4AF37" }}>·</span> Caftan Gharnata
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{slipTx.admin("store_tagline")}</div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                  {slipTx.admin("contact_label")}{" "}
                  <span style={{ fontFamily: "monospace", color: "#111" }}>{slipPhonesLine}</span>
                  {slipSocials && <>{" · "}{slipSocials}</>}
                  {" · "}{slipTx.admin("deliverable")}
                </div>
                {slipAddressesLine && (
                  <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{slipAddressesLine}</div>
                )}
              </div>
              <div style={{ textAlign: "right", fontSize: 12, color: "#333" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#D4AF37" }}>{slipTx.admin("bon_delivery")}</div>
                <div style={{ marginTop: 2 }}>N°: <b>#{selectedOrder.id}</b></div>
                <div>{slipDate(selectedOrder.created_at)}</div>
              </div>
            </div>

            {/* Recipient + delivery — each field with its label (commune / wilaya) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#D4AF37", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{slipTx.admin("recipient")}</div>
                <div style={{ fontSize: 13, color: "#111", lineHeight: 1.8 }}>
                  <div><span style={{ color: "#666" }}>{slipTx.admin("name")}: </span><b>{selectedOrder.customer_name}</b></div>
                  <div><span style={{ color: "#666" }}>{slipTx.admin("phone")}: </span><span dir="ltr">{selectedOrder.customer_phone}</span></div>
                  <div><span style={{ color: "#666" }}>{slipTx.admin("commune")}: </span><b>{selectedOrder.commune}</b></div>
                  <div><span style={{ color: "#666" }}>{slipTx.admin("wilaya")}: </span><b>{selectedOrder.wilaya_name || slipTx.admin("wilaya_ref").replace("{code}", String(selectedOrder.wilaya_code))}</b></div>
                </div>
              </div>
              <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#D4AF37", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>{slipTx.admin("delivery")}</div>
                <div style={{ fontSize: 13, color: "#111", lineHeight: 1.7 }}>
                  <div>{selectedOrder.shipping_type === "HOME" ? slipTx.admin("home_delivery") : slipTx.admin("office_pickup")}</div>
                  <div>{slipTx.admin("cod_payment")}</div>
                  <div>{slipDate(selectedOrder.created_at)} · {slipTime(selectedOrder.created_at)}</div>
                </div>
              </div>
            </div>

            {/* Product table */}
            <div className="slip-no-break" style={{ border: "1px solid #ccc", borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#111" }}>
                <thead>
                  <tr style={{ background: "#111", color: "#fff" }}>
                    <th style={{ padding: 8, textAlign: "right" }}>{slipTx.admin("product")}</th>
                    <th style={{ padding: 8, textAlign: "center" }}>{slipTx.admin("size")}</th>
                    <th style={{ padding: 8, textAlign: "center" }}>{slipTx.admin("color")}</th>
                    <th style={{ padding: 8, textAlign: "center" }}>{slipTx.admin("quantity")}</th>
                    <th style={{ padding: 8, textAlign: "center" }}>{slipTx.common("price")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orderLines(selectedOrder).map((line, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                      <td style={{ padding: 8 }}>
                        <b>{line.title || slipTx.admin("product_ref").replace("{id}", String(line.product_id))}</b>
                        <div style={{ fontSize: 11, color: "#666" }}>#ID: {line.product_id}</div>
                      </td>
                      <td style={{ padding: 8, textAlign: "center" }}>{line.selected_size || "—"}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{line.selected_color || "—"}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{line.quantity}</td>
                      <td style={{ padding: 8, textAlign: "center", fontWeight: 700 }}>{slipPrice(line.unit_price)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="slip-no-break" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <div style={{ width: "55%", border: "1px solid #ccc", borderRadius: 8, padding: 10, fontSize: 13, color: "#111" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>{slipTx.admin("product_price")}:</span><b>{slipPrice(selectedOrder.product_price)} {slipTx.common("currency")}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>{slipTx.admin("shipping_cost")}:</span><b>{slipPrice(selectedOrder.shipping_cost)} {slipTx.common("currency")}</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "2px solid #D4AF37", marginTop: 4, fontWeight: 700, fontSize: 14 }}>
                  <span>{slipTx.admin("total_due")}:</span><span style={{ color: "#D4AF37" }}>{slipPrice(selectedOrder.total_price)} {slipTx.common("currency")}</span>
                </div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 4, textAlign: "center" }}>{slipTx.admin("cod_payment")}</div>
              </div>
            </div>

            {/* QR + signatures */}
            <div className="slip-no-break" style={{ display: "flex", gap: 16, alignItems: "flex-end", marginBottom: 14 }}>
              <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 10, textAlign: "center" }}>
                {qrUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={qrUrl} alt="QR" style={{ width: 110, height: 110, display: "block", margin: "0 auto" }} />
                ) : null}
                <div style={{ fontSize: 10, color: "#666", marginTop: 4, maxWidth: 120 }}>{slipTx.admin("scan_qr_hint")}</div>
              </div>
              <div style={{ flex: 1, fontSize: 11, color: "#666", lineHeight: 1.6 }}>
                <p>{slipTx.admin("thanks_note")}</p>
                <p style={{ color: "#111", fontWeight: 600 }}>{slipTx.admin("confirm_receipt")}: <span style={{ marginRight: 30, marginLeft: 8 }}>☐</span></p>
              </div>
            </div>

            {/* Signature lines — label text removed, only the signing line stays */}
            <div className="slip-no-break" style={{ display: "flex", gap: 40, justifyContent: "space-between", marginTop: 34, fontSize: 12, color: "#333" }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #111", paddingTop: 6 }}>{" "}</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #111", paddingTop: 6 }}>{" "}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable BILINGUAL "bon de livraison" — French + Arabic together, with
          the store logo, client + product info. Independent of the customer's
          chosen language (always shows both languages). */}
      {selectedOrder && printTarget === "delivery" && (
        <div id="print-delivery-slip" className="hidden print:block" dir="ltr">
          <div className="slip-no-break" style={{ fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 14, borderBottom: "2px solid #D4AF37", paddingBottom: 12, marginBottom: 14 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="logo" style={{ width: 64, height: 64, objectFit: "contain" }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#111" }}>
                  Caftan Gharnata <span style={{ color: "#D4AF37" }}>·</span> <span lang="ar" dir="rtl">قفطان غرناطة</span>
                </div>
                <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>
                  {frT.admin("contact_label")}{" "}
                  <span style={{ fontFamily: "monospace", color: "#111" }}>{slipPhonesLine}</span>
                  {slipSocials && <>{" · "}{slipSocials}</>}
                </div>
                {slipAddressesLine && (
                  <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{slipAddressesLine}</div>
                )}
              </div>
              <div style={{ textAlign: "right", fontSize: 13, color: "#333" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#D4AF37" }}>
                  Bon de livraison · <span lang="ar" dir="rtl">قسيمة التوصيل</span>
                </div>
                <div style={{ marginTop: 2 }}>N°: <b>#{selectedOrder.id}</b></div>
                <div>{formatDate(selectedOrder.created_at, "fr-FR")}</div>
              </div>
            </div>

            {/* Client */}
            <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 10, marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#D4AF37", marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>
                Destinataire · <span lang="ar" dir="rtl">المستلم</span>
              </div>
              <div style={{ fontSize: 13, color: "#111", lineHeight: 1.9 }}>
                <div><b>{selectedOrder.customer_name}</b></div>
                <div><span style={{ color: "#666" }}>{frT.admin("name")} / {arT.admin("name")}: </span><b>{selectedOrder.customer_name}</b></div>
                <div><span style={{ color: "#666" }}>{frT.admin("phone")} / {arT.admin("phone")}: </span><span dir="ltr">{selectedOrder.customer_phone}</span></div>
                <div><span style={{ color: "#666" }}>{frT.admin("commune")} / {arT.admin("commune")}: </span><b>{selectedOrder.commune}</b></div>
                <div><span style={{ color: "#666" }}>{frT.admin("wilaya")} / {arT.admin("wilaya")}: </span><b>{(selectedOrder.wilaya_name_fr || frT.admin("wilaya_ref").replace("{code}", String(selectedOrder.wilaya_code))) + " · " + (selectedOrder.wilaya_name || arT.admin("wilaya_ref").replace("{code}", String(selectedOrder.wilaya_code)))}</b></div>
                <div>
                  <span style={{ color: "#666" }}>{frT.admin("delivery_type")} / {arT.admin("delivery_type")}: </span>
                  <b>{selectedOrder.shipping_type === "HOME" ? frT.admin("home_delivery") : frT.admin("office_pickup")} · {selectedOrder.shipping_type === "HOME" ? arT.admin("home_delivery") : arT.admin("office_pickup")}</b>
                </div>
                <div>
                  <span style={{ color: "#666" }}>Paiement / الدفع: </span>
                  <b>{frT.admin("cod_payment")} · {arT.admin("cod_payment")}</b>
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="slip-no-break" style={{ border: "1px solid #ccc", borderRadius: 8, overflow: "hidden", marginBottom: 14 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, color: "#111" }}>
                <thead>
                  <tr style={{ background: "#111", color: "#fff" }}>
                    <th style={{ padding: 8, textAlign: "left" }}>{frT.admin("product")} / {arT.admin("product")}</th>
                    <th style={{ padding: 8, textAlign: "center" }}>{frT.admin("size")} / {arT.admin("size")}</th>
                    <th style={{ padding: 8, textAlign: "center" }}>{frT.admin("color")} / {arT.admin("color")}</th>
                    <th style={{ padding: 8, textAlign: "center" }}>Qté / الكمية</th>
                    <th style={{ padding: 8, textAlign: "center" }}>{frT.common("price")} / {arT.common("price")}</th>
                  </tr>
                </thead>
                <tbody>
                  {orderLines(selectedOrder).map((line, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #eee" }}>
                      <td style={{ padding: 8 }}>
                        <b>{line.title || frT.admin("product_ref").replace("{id}", String(line.product_id))}</b>
                        <div style={{ fontSize: 11, color: "#666" }}>#ID: {line.product_id}</div>
                      </td>
                      <td style={{ padding: 8, textAlign: "center" }}>{line.selected_size || "—"}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{line.selected_color || "—"}</td>
                      <td style={{ padding: 8, textAlign: "center" }}>{line.quantity}</td>
                      <td style={{ padding: 8, textAlign: "center", fontWeight: 700 }}>{slipPrice(line.unit_price)} DA</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="slip-no-break" style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
              <div style={{ width: "55%", border: "1px solid #ccc", borderRadius: 8, padding: 10, fontSize: 13, color: "#111" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>{frT.admin("product_price")} / {arT.admin("product_price")}:</span><b>{slipPrice(selectedOrder.product_price)} DA</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                  <span>{frT.admin("shipping_cost")} / {arT.admin("shipping_cost")}:</span><b>{slipPrice(selectedOrder.shipping_cost)} DA</b>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "2px solid #D4AF37", marginTop: 4, fontWeight: 700, fontSize: 14 }}>
                  <span>{frT.admin("total_due")} / {arT.admin("total_due")}:</span><span style={{ color: "#D4AF37" }}>{slipPrice(selectedOrder.total_price)} DA</span>
                </div>
                <div style={{ fontSize: 11, color: "#666", marginTop: 4, textAlign: "center" }}>
                  {frT.admin("cod_payment")} · {arT.admin("cod_payment")}
                </div>
              </div>
            </div>

            {/* Signatures — label text removed, only the signing line stays */}
            <div className="slip-no-break" style={{ display: "flex", gap: 40, justifyContent: "space-between", marginTop: 34, fontSize: 12, color: "#333" }}>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #111", paddingTop: 6 }}>{" "}</div>
              </div>
              <div style={{ flex: 1, textAlign: "center" }}>
                <div style={{ borderTop: "1px solid #111", paddingTop: 6 }}>{" "}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
