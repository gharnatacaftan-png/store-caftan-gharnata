"use client";

import { useState, useTransition } from "react";
import {
  HardDrive, Database, Package, Film, Trash2, ChevronDown, ChevronUp, AlertTriangle, CheckSquare, Square,
} from "lucide-react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import RefreshButton from "@/components/admin/RefreshButton";
import { deleteWithMediaAction, deleteSingleMediaAction, deleteOrphansAction } from "./actions";
import { useLang } from "@/hooks/useLang";
import { t, type Lang } from "@/lib/i18n";

type ProductStorageItem = {
  id: number;
  title: string;
  usedBytes: number;
  mediaCount: number;
  imagesCount: number;
  videosCount: number;
  media: Array<{
    id: number;
    r2_url: string;
    file_type: "IMAGE" | "VIDEO";
    file_size_bytes: number;
    is_primary?: boolean;
  }>;
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}
interface StorageOverview {
  r2: {
    limitGb: number;
    usedBytes: number;
    usedGb: number;
    freeGb: number;
    percent: number;
    status: string;
    measured: boolean;
    objectCount: number;
    trackedBytes: number;
    orphanCount: number;
    orphansBytes: number;
    orphans: Array<{ key: string; size: number }>;
  };
  d1: { limitGb: number; totalRows: number; ordersCount: number; productsCount: number; mediaCount: number; usedMb: number; usedGb: number; freeGb: number; percent: number };
  products: ProductStorageItem[];
}

type MediaItem = ProductStorageItem["media"][number];

function StorageBar({
  icon: Icon, title, subtitle, usedLabel, freeLabel, percent, status, lang,
}: {
  icon: React.ElementType; title: string; subtitle: string;
  usedLabel: string; freeLabel: string; percent: number; status?: string; lang: Lang;
}) {
  const tx = t(lang);
  // Black + gold: every bar is gold; red only when storage is genuinely full.
  const barColor =
    status === "danger" ? "bg-red-500"
    : "bg-[#D4AF37]";

  const textColor =
    status === "danger" ? "text-red-400 border-red-500/20 bg-red-500/10"
    : "text-[#D4AF37] border-[#D4AF37]/20 bg-[#D4AF37]/10";

  return (
    <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${textColor}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm">{title}</p>
            <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full border ${textColor}`}>
          {Math.max(percent, 0).toFixed(1)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-[#1a1a24] rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.max(0.5, percent)}%` }} />
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{tx.admin("used_label")} <span className="text-white font-semibold">{usedLabel}</span></span>
        <span className="text-gray-400">{tx.admin("remaining_label")} <span className="text-[#D4AF37] font-semibold">{freeLabel}</span></span>
      </div>
    </div>
  );
}

export default function CleanupClient({ initialOverview }: { initialOverview: StorageOverview }) {
  const { lang, dir } = useLang();
  const tx = t(lang);
  const locale = lang === "ar" ? "ar-DZ" : "en-US";

  const [overview, setOverview] = useState(initialOverview);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<Set<number>>(new Set());

  // Confirm modals state
  const [confirmDelete, setConfirmDelete] = useState<{ type: "product" | "media"; productId: number; mediaIds?: number[]; label: string } | null>(null);

  const [pending, startTransition] = useTransition();
  const [orphanNotice, setOrphanNotice] = useState<string | null>(null);

  // Recompute the R2 bar after bytes are freed, keeping the page in sync until
  // the next server refresh (RefreshButton re-runs dbGetStorageOverview).
  function applyR2Delta(freedBytes: number) {
    setOverview(prev => {
      const used = Math.max(0, prev.r2.usedBytes - freedBytes);
      const usedGb = used / (1024 * 1024 * 1024);
      return {
        ...prev,
        r2: {
          ...prev.r2,
          usedBytes: used,
          usedGb,
          freeGb: Math.max(0, prev.r2.limitGb - usedGb),
          percent: Math.min(100, (used / (prev.r2.limitGb * 1024 * 1024 * 1024)) * 100),
        },
      };
    });
  }

  // Expand/collapse a product
  function toggleExpand(id: number) {
    setExpandedId(prev => prev === id ? null : id);
    setSelectedMedia(new Set()); // reset selection when switching
  }

  // Toggle single media selection
  function toggleMedia(id: number) {
    setSelectedMedia(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  // Select all for product
  function selectAll(media: MediaItem[]) {
    setSelectedMedia(new Set(media.map(m => m.id)));
  }
  function deselectAll() { setSelectedMedia(new Set()); }

  // Execute deletion of selected media files
  function handleDeleteSelected(productId: number) {
    const ids = Array.from(selectedMedia);
    if (ids.length === 0) return;
    const product = overview.products.find(p => p.id === productId);
    setConfirmDelete({
      type: "media",
      productId,
      mediaIds: ids,
      label: tx.admin("delete_files").replace("{n}", String(ids.length)) + ` — "${product?.title || ""}"`,
    });
  }

  // Execute deletion of entire product
  function handleDeleteProduct(productId: number) {
    const product = overview.products.find(p => p.id === productId);
    setConfirmDelete({
      type: "product",
      productId,
      label: `${tx.admin("delete_product_confirm_label")}: "${product?.title || ""}"`,
    });
  }

  // Delete every R2 object that isn't referenced anywhere in D1.
  function handleCleanOrphans() {
    startTransition(async () => {
      setOrphanNotice(null);
      const res = await deleteOrphansAction();
      if (res && typeof res.deleted === "number" && res.deleted > 0) {
        const bytes = res.bytes ?? 0;
        setOrphanNotice(tx.admin("orphans_deleted").replace("{n}", String(res.deleted)).replace("{size}", formatBytes(bytes)));
        applyR2Delta(bytes);
        setOverview(prev => ({ ...prev, r2: { ...prev.r2, orphanCount: 0, orphansBytes: 0, orphans: [] } }));
      }
    });
  }

  // Confirm logic
  function doConfirm() {
    if (!confirmDelete) return;
    startTransition(async () => {
      if (confirmDelete.type === "product") {
        const removed = overview.products.find(p => p.id === confirmDelete.productId)?.usedBytes ?? 0;
        await deleteWithMediaAction(confirmDelete.productId);
        applyR2Delta(removed);
        setOverview(prev => ({ ...prev, products: prev.products.filter(p => p.id !== confirmDelete.productId) }));
        if (expandedId === confirmDelete.productId) setExpandedId(null);
      } else if (confirmDelete.type === "media" && confirmDelete.mediaIds) {
        const removed = overview.products
          .find(p => p.id === confirmDelete.productId)?.media
          .filter(m => confirmDelete.mediaIds!.includes(m.id))
          .reduce((s, m) => s + m.file_size_bytes, 0) ?? 0;
        for (const mid of confirmDelete.mediaIds) {
          await deleteSingleMediaAction(mid);
        }
        applyR2Delta(removed);
        for (const mid of confirmDelete.mediaIds) {
          await deleteSingleMediaAction(mid);
        }
        setOverview(prev => ({
          ...prev,
          products: prev.products.map(p => {
            if (p.id !== confirmDelete.productId) return p;
            const removed = new Set(confirmDelete.mediaIds);
            const newMedia = p.media.filter(m => !removed.has(m.id));
            const newBytes = newMedia.reduce((s, m) => s + m.file_size_bytes, 0);
            return { ...p, media: newMedia, mediaCount: newMedia.length, usedBytes: newBytes, imagesCount: newMedia.filter(m => m.file_type === "IMAGE").length, videosCount: newMedia.filter(m => m.file_type === "VIDEO").length };
          }),
        }));
        setSelectedMedia(new Set());
      }
    });
  }

  const productsWithMedia = overview.products.filter(p => p.mediaCount > 0);

  return (
    <div className="p-6 lg:p-10" dir={dir}>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmDelete !== null}
        title={confirmDelete?.type === "product" ? tx.admin("delete_product_confirm_title") : tx.admin("delete_media_confirm_title")}
        message={
          confirmDelete?.type === "product"
            ? tx.admin("delete_product_confirm_msg")
            : tx.admin("delete_media_confirm_msg").replace("{n}", String(confirmDelete?.mediaIds?.length ?? 0))
        }
        confirmLabel={confirmDelete?.type === "product" ? tx.admin("delete_product_confirm_label") : tx.admin("delete_files").replace("{n}", String(confirmDelete?.mediaIds?.length ?? 0))}
        variant="danger"
        onConfirm={doConfirm}
        onClose={() => setConfirmDelete(null)}
      />

      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{tx.admin("cleanup_title")}</h1>
          <p className="mt-1 text-gray-500">{tx.admin("cleanup_subtitle")}</p>
        </div>
        <RefreshButton />
      </div>

      {/* ── Storage Bars ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-10">
        {/* R2 Used */}
        <StorageBar
          icon={HardDrive}
          title={tx.admin("r2_used")}
          subtitle={tx.admin("from_total").replace("{used}", formatBytes(overview.r2.usedBytes)).replace("{total}", String(overview.r2.limitGb))}
          usedLabel={formatBytes(overview.r2.usedBytes)}
          freeLabel={`${overview.r2.freeGb.toFixed(2)} GB`}
          percent={overview.r2.percent}
          status={overview.r2.status}
          lang={lang}
        />
        {/* R2 Free */}
        <StorageBar
          icon={HardDrive}
          title={tx.admin("r2_free")}
          subtitle={`${tx.admin("remaining_label")} ${overview.r2.freeGb.toFixed(2)} GB ${tx.admin("of")} ${overview.r2.limitGb} GB`}
          usedLabel={tx.admin("free_label").replace("{free}", overview.r2.freeGb.toFixed(2))}
          freeLabel={tx.admin("limit_total").replace("{limit}", String(overview.r2.limitGb))}
          percent={100 - overview.r2.percent}
          lang={lang}
        />
        {/* D1 Used */}
        <StorageBar
          icon={Database}
          title={tx.admin("d1_db_title")}
          subtitle={tx.admin("records_limit").replace("{n}", overview.d1.totalRows.toLocaleString(locale))}
          usedLabel={tx.admin("estimate_used").replace("{mb}", overview.d1.usedMb.toFixed(1))}
          freeLabel={`${overview.d1.freeGb.toFixed(2)} GB`}
          percent={overview.d1.percent}
          lang={lang}
        />
        {/* D1 Details */}
        <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#D4AF37]/10 text-[#D4AF37]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-white text-sm">{tx.admin("d1_details")}</p>
              <p className="text-gray-500 text-xs">{tx.admin("d1_distribution")}</p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            {[
              { label: tx.admin("orders_row"), count: overview.d1.ordersCount, color: "bg-[#D4AF37]" },
              { label: tx.admin("products_row"), count: overview.d1.productsCount, color: "bg-[#E5C158]" },
              { label: tx.admin("media_row"), count: overview.d1.mediaCount, color: "bg-[#B8902B]" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${row.color}`} />
                  <span className="text-gray-400">{row.label}</span>
                </div>
                <span className="text-white font-mono font-bold">{row.count.toLocaleString(locale)} {tx.admin("record_suffix")}</span>
              </div>
            ))}
            <div className="border-t border-white/5 pt-2 flex justify-between text-xs text-gray-500 font-bold">
              <span>{tx.admin("total_label")}</span>
              <span className="text-white">{overview.d1.totalRows.toLocaleString(locale)} {tx.admin("record_suffix")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real R2 measurement indicator */}
      {!overview.r2.measured && (
        <p className="text-xs text-amber-400 mb-4 -mt-4 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5" /> {tx.admin("r2_estimated")}
        </p>
      )}

      {/* ── Orphaned R2 files ── */}
      {overview.r2.orphanCount > 0 && (
        <div className="bg-[#111118] border border-amber-500/20 rounded-2xl p-5 mb-6 space-y-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">{tx.admin("orphans_title")}</p>
                <p className="text-gray-500 text-xs max-w-md">{tx.admin("orphans_desc")}</p>
              </div>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-400 whitespace-nowrap">
              {tx.admin("orphans_label").replace("{n}", String(overview.r2.orphanCount)).replace("{size}", formatBytes(overview.r2.orphansBytes))}
            </span>
          </div>
          <button
            onClick={handleCleanOrphans}
            disabled={pending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {tx.admin("orphans_clean")}
          </button>
          {orphanNotice && <p className="text-xs text-emerald-400">{orphanNotice}</p>}
        </div>
      )}

      {/* ── Product Media List ── */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">{tx.admin("product_media")}</h2>
        <span className="text-xs text-gray-500">{tx.admin("products_with_media").replace("{n}", String(productsWithMedia.length))}</span>
      </div>

      {productsWithMedia.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-[#111118] p-10 text-center text-gray-500">
          {tx.admin("no_media")}
        </div>
      ) : (
        <div className="space-y-3">
          {productsWithMedia.map(item => {
            const isExpanded = expandedId === item.id;
            const primaryThumb = item.media.find(m => m.is_primary)?.r2_url || null;
            const productSelectedCount = Array.from(selectedMedia).filter(id => item.media.some(m => m.id === id)).length;

            return (
              <div key={item.id} className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden">
                {/* Product row */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-5">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-[#1a1a24] border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {primaryThumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={primaryThumb} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-gray-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-semibold">{item.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {item.mediaCount} · {formatBytes(item.usedBytes)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleDeleteProduct(item.id)}
                      disabled={pending}
                      className="flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-xl transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {tx.admin("delete_product")}
                    </button>
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-2 rounded-xl transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {isExpanded ? tx.admin("collapse") : tx.admin("select_media")}
                    </button>
                  </div>
                </div>

                {/* Expanded: individual media picker */}
                {isExpanded && (
                  <div className="border-t border-white/5 bg-[#0d0d14] p-5 space-y-4">
                    {/* Selection controls */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <p className="text-sm text-gray-400">
                        {tx.admin("select_files_hint")}
                      </p>
                      <div className="flex items-center gap-2">
                        <button onClick={() => selectAll(item.media)} className="text-xs text-[#D4AF37] hover:underline">{tx.admin("select_all")}</button>
                        <span className="text-gray-700">|</span>
                        <button onClick={deselectAll} className="text-xs text-gray-400 hover:underline">{tx.admin("deselect_all")}</button>
                        {productSelectedCount > 0 && (
                          <button
                            onClick={() => handleDeleteSelected(item.id)}
                            disabled={pending}
                            className="flex items-center gap-1.5 text-xs font-bold bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-red-500/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            {tx.admin("delete_files").replace("{n}", String(productSelectedCount))}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Media grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {item.media.map(m => {
                        const isChecked = selectedMedia.has(m.id);
                        return (
                          <button
                            key={m.id}
                            onClick={() => toggleMedia(m.id)}
                            className={`relative group rounded-xl border-2 text-left overflow-hidden transition-all ${
                              isChecked
                                ? "border-red-500 bg-red-500/10"
                                : "border-white/10 bg-[#111118] hover:border-white/30"
                            }`}
                          >
                            {/* Thumbnail or video icon */}
                            <div className="aspect-square flex items-center justify-center bg-[#1a1a24] relative">
                              {m.file_type === "IMAGE" ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={m.r2_url}
                                  alt="media"
                                  className="w-full h-full object-cover"
                                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                />
                              ) : (
                                <div className="relative w-full h-full bg-black flex items-center justify-center">
                                  <video src={m.r2_url} className="w-full h-full object-cover opacity-80" muted playsInline preload="metadata" />
                                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <Film className="w-6 h-6 text-[#D4AF37] drop-shadow" />
                                  </div>
                                </div>
                              )}
                              {/* Overlay check */}
                              <div className={`absolute inset-0 flex items-center justify-center transition-all ${isChecked ? "bg-red-500/30" : "bg-transparent group-hover:bg-black/20"}`}>
                                {isChecked
                                  ? <CheckSquare className="w-7 h-7 text-red-400 drop-shadow" />
                                  : <Square className="w-7 h-7 text-white/30 opacity-0 group-hover:opacity-100 transition-opacity" />
                                }
                              </div>
                              {m.is_primary && (
                                <span className="absolute top-1.5 right-1.5 text-[9px] font-bold bg-[#D4AF37] text-black px-1.5 py-0.5 rounded-full leading-none">{tx.admin("primary_badge")}</span>
                              )}
                            </div>

                            {/* Meta */}
                            <div className="p-2 space-y-0.5">
                              <p className={`text-[10px] font-bold ${isChecked ? "text-red-400" : "text-gray-400"}`}>
                                {m.file_type === "IMAGE" ? tx.admin("media_type_image") : tx.admin("media_type_video")}
                              </p>
                              <p className="text-[10px] text-gray-600">{formatBytes(m.file_size_bytes)}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info note */}
      <div className="mt-6 flex gap-3 items-start rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-4 text-xs text-[#D4AF37]">
        <AlertTriangle className="w-4 h-4 shrink-0 text-[#D4AF37] mt-0.5" />
        <p>{tx.admin("delete_info_note")}</p>
      </div>
    </div>
  );
}
