"use client";

import { useState } from "react";
import Image from "next/image";
import { Images, Loader2, RefreshCcw, UploadCloud, AlertTriangle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { HERO_DEFAULT_IMAGE, categoryDefaultImage } from "@/lib/media-defaults";
import { resolveMediaUrl, uploadFileViaProxy } from "@/lib/media-utils";
import { csrfHeaders } from "@/lib/client-csrf";

interface CatRow {
  id: number;
  slug: string;
  name: string;
  name_ar: string;
  image_url: string | null;
  is_active: boolean;
}

export default function GalleryClient({
  initialCategories,
  initialHeroImage,
}: {
  initialCategories: CatRow[];
  initialHeroImage: string | null;
}) {
  const { lang } = useLang();
  const tx = t(lang);
  const [categories, setCategories] = useState<CatRow[]>(initialCategories);
  const [heroImage, setHeroImage] = useState<string | null>(initialHeroImage);
  const [busy, setBusy] = useState<string | null>(null); // e.g. "hero-upload" | "cat-3-upload" | "hero-reset"
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  async function getCsrf(): Promise<string> {
    const res = await fetch("/api/csrf");
    const data = await res.json();
    return data.csrfToken;
  }

  // Upload a single image file via Cloudflare Worker (handles HEIC to JPEG & up to 500MB without Vercel payload limits)
  async function uploadImage(file: File): Promise<string> {
    const hdrs = await csrfHeaders();
    const result = await uploadFileViaProxy(file, hdrs);
    return result.url;
  }

  // Persist a hero/category image change via the admin gallery API.
  async function persist(body: Record<string, unknown>): Promise<void> {
    const csrf = await getCsrf();
    const res = await fetch("/api/admin/gallery", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-csrf-token": csrf },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) throw new Error(data.error || "failed");
  }

  function showNotice(ok: boolean, text: string) {
    setNotice({ ok, text });
    setTimeout(() => setNotice(null), 4000);
  }

  async function handleChange(target: string, file: File | undefined) {
    if (!file) return;
    setBusy(`${target}-upload`);
    try {
      const url = await uploadImage(file);
      if (target === "hero") {
        await persist({ type: "hero", imageUrl: url });
        setHeroImage(url);
      } else {
        const id = Number(target.replace("cat-", ""));
        await persist({ type: "category", categoryId: id, imageUrl: url });
        setCategories(prev => prev.map(c => (c.id === id ? { ...c, image_url: url } : c)));
      }
      showNotice(true, tx.admin("gallery_saved"));
    } catch {
      showNotice(false, tx.admin("gallery_error"));
    } finally {
      setBusy(null);
    }
  }

  async function handleToggleActive(categoryId: number, active: boolean) {
    setBusy(`cat-${categoryId}-active`);
    try {
      await persist({ type: "category-active", categoryId, active });
      setCategories(prev => prev.map(c => (c.id === categoryId ? { ...c, is_active: active } : c)));
      showNotice(true, active ? tx.admin("gallery_category_enabled") : tx.admin("gallery_category_disabled"));
    } catch {
      showNotice(false, tx.admin("gallery_error"));
    } finally {
      setBusy(null);
    }
  }

  async function handleReset(target: string) {
    setBusy(`${target}-reset`);
    try {
      if (target === "hero") {
        await persist({ type: "hero", imageUrl: "" });
        setHeroImage(null);
      } else {
        const id = Number(target.replace("cat-", ""));
        await persist({ type: "category", categoryId: id, imageUrl: "" });
        setCategories(prev => prev.map(c => (c.id === id ? { ...c, image_url: null } : c)));
      }
      showNotice(true, tx.admin("gallery_reset"));
    } catch {
      showNotice(false, tx.admin("gallery_error"));
    } finally {
      setBusy(null);
    }
  }

  const actions = (target: string) => {
    const busyUpload = busy === `${target}-upload`;
    const busyReset = busy === `${target}-reset`;
    const disabled = busyUpload || busyReset || busy !== null;
    return (
      <div className="flex flex-wrap gap-2">
        <input
          type="file"
          accept="image/*,video/*,image/heic,image/heif,.heic,.heif"
          className="hidden"
          id={`file-${target}`}
          onChange={e => {
            const file = e.target.files?.[0];
            e.target.value = ""; // allow re-selecting the same file later
            handleChange(target, file);
          }}
        />
        <label
          htmlFor={`file-${target}`}
          className={`cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all select-none ${
            disabled
              ? "bg-white/5 text-gray-500 cursor-not-allowed"
              : "bg-[#D4AF37] text-black hover:bg-[#F5D061] shadow-md shadow-[#D4AF37]/20"
          }`}
        >
          {busyUpload ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
          {busyUpload ? tx.admin("gallery_uploading") : tx.admin("gallery_change")}
        </label>
        <button
          type="button"
          onClick={() => handleReset(target)}
          disabled={disabled}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all border ${
            disabled
              ? "border-white/5 text-gray-500 cursor-not-allowed"
              : "border-white/10 text-gray-300 hover:border-[#D4AF37]/40 hover:text-[#D4AF37]"
          }`}
        >
          {busyReset ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
          {tx.admin("gallery_reset_btn")}
        </button>
      </div>
    );
  };

  const heroIsDefault = !heroImage;

  return (
    <div className="p-6 lg:p-10" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="w-11 h-11 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/20 flex items-center justify-center shrink-0">
          <Images className="w-5 h-5 text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">{tx.admin("gallery_title")}</h1>
          <p className="text-gray-500 text-sm mt-1">{tx.admin("gallery_subtitle")}</p>
        </div>
      </div>

      {/* Notice */}
      {notice && (
        <div
          className={`mb-6 flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium ${
            notice.ok
              ? "border-[#D4AF37]/25 bg-[#D4AF37]/10 text-[#D4AF37]"
              : "border-red-500/25 bg-red-500/10 text-red-400"
          }`}
        >
          {notice.ok ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          {notice.text}
        </div>
      )}

      {/* ── Hero image ── */}
      <section className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
          <h2 className="text-lg font-bold text-white">{tx.admin("gallery_hero_title")}</h2>
        </div>
        <p className="text-gray-500 text-sm mb-4">{tx.admin("gallery_hero_hint")}</p>

        <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 lg:p-6">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Preview */}
            <div className="relative w-full lg:w-80 h-44 lg:h-52 rounded-xl overflow-hidden border border-white/10 bg-black/40 shrink-0">
              <Image
                src={resolveMediaUrl(heroImage || HERO_DEFAULT_IMAGE)}
                alt="hero"
                fill
                unoptimized
                className="object-cover"
              />
              <span
                className={`absolute top-2 ${lang === "ar" ? "left-2" : "right-2"} rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                  heroIsDefault
                    ? "text-gray-300 border-white/15 bg-black/60"
                    : "text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10"
                }`}
              >
                {heroIsDefault ? tx.admin("gallery_default_badge") : tx.admin("gallery_custom_badge")}
              </span>
            </div>
            {/* Actions */}
            <div className="flex flex-col justify-between gap-4 flex-1">
              <div className="space-y-2 text-sm">
                <p className="text-gray-400">
                  {tx.admin("gallery_current_photo")}:{" "}
                  <span className="text-white font-mono text-xs break-all">{heroImage || tx.admin("gallery_default_badge")}</span>
                </p>
              </div>
              <div>{actions("hero")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category images ── */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#D4AF37]" />
          <h2 className="text-lg font-bold text-white">{tx.admin("gallery_cats_title")}</h2>
        </div>
        <p className="text-gray-500 text-sm mb-4">{tx.admin("gallery_cats_hint")}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map(cat => {
            const isDefault = !cat.image_url;
            const target = `cat-${cat.id}`;
            return (
              <div key={cat.id} className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden flex flex-col">
                <div className="relative h-36 overflow-hidden border-b border-white/5 bg-black/40">
                  <Image
                    src={resolveMediaUrl(cat.image_url || categoryDefaultImage(cat.slug))}
                    alt={cat.name}
                    fill
                    unoptimized
                    className={`object-cover ${cat.is_active ? "" : "grayscale opacity-50"}`}
                  />
                  <span
                    className={`absolute top-2 ${lang === "ar" ? "left-2" : "right-2"} rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                      isDefault
                        ? "text-gray-300 border-white/15 bg-black/60"
                        : "text-[#D4AF37] border-[#D4AF37]/30 bg-[#D4AF37]/10"
                    }`}
                  >
                    {isDefault ? tx.admin("gallery_default_badge") : tx.admin("gallery_custom_badge")}
                  </span>
                  {/* visibility badge */}
                  <span
                    className={`absolute top-2 ${lang === "ar" ? "right-2" : "left-2"} rounded-full border px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 ${
                      cat.is_active
                        ? "text-emerald-400 border-emerald-400/30 bg-emerald-400/10"
                        : "text-gray-300 border-white/15 bg-black/60"
                    }`}
                  >
                    {cat.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {cat.is_active ? tx.admin("gallery_category_visible") : tx.admin("gallery_category_hidden")}
                  </span>
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-white font-bold text-sm">{cat.name}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{cat.name_ar} · <span className="font-mono">{cat.slug}</span></p>
                    </div>
                    {/* enable / disable toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(cat.id, !cat.is_active)}
                      disabled={busy !== null}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        busy !== null
                          ? "border-white/5 text-gray-500 cursor-not-allowed"
                          : cat.is_active
                            ? "border-white/10 text-gray-400 hover:border-red-400/40 hover:text-red-400"
                            : "border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                      }`}
                    >
                      {busy === `cat-${cat.id}-active` ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : cat.is_active ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      {cat.is_active ? tx.admin("gallery_category_disable") : tx.admin("gallery_category_enable")}
                    </button>
                  </div>
                  <div className="mt-auto">{actions(target)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
