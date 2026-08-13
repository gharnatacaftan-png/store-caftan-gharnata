"use client";
import { useState, useTransition } from "react";
import { Save, Search, Zap, Plus, Trash2, Edit2, X } from "lucide-react";
import RefreshButton from "@/components/admin/RefreshButton";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { csrfHeaders } from "@/lib/client-csrf";

export interface D1ShippingRate {
  code: number | string;
  wilaya_code?: number;
  wilaya_name_ar?: string;
  wilaya_name_fr?: string;
  wilaya_name_en?: string;
  name_fr?: string;
  name_en?: string;
  nameAr?: string;
  name?: string;
  price_home?: number;
  price_desk?: number;
  domicile?: number;
  bureau?: number;
  is_deliverable?: boolean;
}

interface RawShippingRate {
  code?: number | string;
  wilaya_code?: number;
  wilaya_name_ar?: string;
  wilaya_name_fr?: string;
  wilaya_name_en?: string;
  wilaya_name?: string;
  name_fr?: string;
  name_en?: string;
  nameAr?: string;
  name?: string;
  price_home?: number;
  price_desk?: number;
  domicile?: number;
  bureau?: number;
  is_deliverable?: boolean;
}

export default function ShippingClient({ initialRates }: { initialRates: RawShippingRate[] }) {
  const { lang, dir } = useLang();
  const tx = t(lang);

  const normalizedInitial: D1ShippingRate[] = initialRates.map(r => ({
    code: r.code ?? r.wilaya_code ?? 0,
    wilaya_code: Number(r.code || r.wilaya_code),
    nameAr: r.nameAr || r.wilaya_name_ar || r.wilaya_name || tx.admin("wilaya_name").replace("{code}", String(r.code || r.wilaya_code)),
    name: r.name || r.wilaya_name_fr || r.name_fr || `Wilaya ${r.code || r.wilaya_code}`,
    name_en: r.name_en || r.wilaya_name_en || r.name_fr || `Wilaya ${r.code || r.wilaya_code}`,
    domicile: r.price_home ?? r.domicile ?? 0,
    bureau: r.price_desk ?? r.bureau ?? 0,
    is_deliverable: r.is_deliverable ?? true,
  }));

  const [rates, setRates] = useState<D1ShippingRate[]>(normalizedInitial);
  const [search, setSearch] = useState("");
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);
  const [bulkDomicile, setBulkDomicile] = useState("");
  const [bulkBureau, setBulkBureau] = useState("");

  // Add wilaya form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newWilaya, setNewWilaya] = useState({
    code: "",
    nameAr: "",
    nameFr: "",
    nameEn: "",
    domicile: "",
    bureau: "",
  });
  const [addError, setAddError] = useState("");
  const [adding, startAdd] = useTransition();

  // Edit wilaya state
  const [editingCode, setEditingCode] = useState<number | string | null>(null);
  const [editForm, setEditForm] = useState({
    nameAr: "",
    nameFr: "",
    nameEn: "",
    domicile: "",
    bureau: "",
  });
  const [editError, setEditError] = useState("");
  const [updating, startUpdate] = useTransition();

  const filtered = rates.filter(r => {
    const s = search.toLowerCase();
    const nameAr = r.nameAr || "";
    const nameFr = r.name || "";
    const nameEn = r.name_en || "";
    const code = r.code.toString();
    return nameAr.includes(search) || nameFr.toLowerCase().includes(s) || nameEn.toLowerCase().includes(s) || code.includes(s);
  });

  function updateRate(code: number | string, field: "domicile" | "bureau", value: number) {
    setRates(prev => prev.map(r => r.code === code ? { ...r, [field]: value } : r));
  }

  function applyBulk() {
    if (!bulkDomicile && !bulkBureau) return;
    setRates(prev => prev.map(r => ({
      ...r,
      ...(bulkDomicile ? { domicile: Number(bulkDomicile) } : {}),
      ...(bulkBureau ? { bureau: Number(bulkBureau) } : {}),
    })));
    setBulkDomicile(""); setBulkBureau("");
  }

  function handleSave() {
    startSave(async () => {
      try {
        const updates = rates.map(r => ({
          code: Number(r.code),
          price_home: r.domicile,
          price_desk: r.bureau,
        }));

        const res = await fetch("/api/admin/shipping", {
          method: "POST",
          headers: await csrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify(updates),
        });

        if (res.ok) {
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);
        } else {
          alert(tx.admin("save_failed_shipping"));
        }
      } catch {
        alert(tx.admin("server_error"));
      }
    });
  }

  function handleAddWilaya() {
    setAddError("");
    const code = Number(newWilaya.code);
    if (!Number.isInteger(code) || code < 1 || code > 999) {
      setAddError(tx.admin("invalid_wilaya_code"));
      return;
    }
    if (!newWilaya.nameAr.trim() || !newWilaya.nameFr.trim() || !newWilaya.nameEn.trim()) {
      setAddError(tx.admin("all_names_required"));
      return;
    }
    const domicile = Number(newWilaya.domicile);
    const bureau = Number(newWilaya.bureau);
    if (!Number.isFinite(domicile) || domicile < 0 || !Number.isFinite(bureau) || bureau < 0) {
      setAddError(tx.admin("invalid_prices"));
      return;
    }

    startAdd(async () => {
      try {
        const res = await fetch("/api/admin/shipping", {
          method: "PUT",
          headers: await csrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            wilaya_code: code,
            wilaya_name: newWilaya.nameAr.trim(),
            name_fr: newWilaya.nameFr.trim(),
            name_en: newWilaya.nameEn.trim(),
            price_home: domicile,
            price_desk: bureau,
          }),
        });

        if (res.ok) {
          // Refresh rates
          const refreshRes = await fetch("/api/shipping-rates");
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            if (data.rates) {
              setRates(data.rates.map((r: RawShippingRate) => ({
                code: r.code || r.wilaya_code,
                wilaya_code: Number(r.code || r.wilaya_code),
                nameAr: r.nameAr || r.wilaya_name_ar || r.wilaya_name || tx.admin("wilaya_name").replace("{code}", String(r.code || r.wilaya_code)),
                name: r.name || r.wilaya_name_fr || r.name_fr || `Wilaya ${r.code || r.wilaya_code}`,
                name_en: r.name_en || r.wilaya_name_en || r.name_fr || `Wilaya ${r.code || r.wilaya_code}`,
                domicile: r.price_home ?? r.domicile ?? 0,
                bureau: r.price_desk ?? r.bureau ?? 0,
                is_deliverable: r.is_deliverable ?? true,
              })));
            }
          }
          setShowAddForm(false);
          setNewWilaya({ code: "", nameAr: "", nameFr: "", nameEn: "", domicile: "", bureau: "" });
        } else {
          const error = await res.json();
          setAddError(error.error || tx.admin("add_wilaya_failed"));
        }
      } catch {
        setAddError(tx.admin("server_error"));
      }
    });
  }

  function startEditWilaya(rate: D1ShippingRate) {
    setEditingCode(rate.code);
    setEditForm({
      nameAr: rate.nameAr || "",
      nameFr: rate.name || "",
      nameEn: rate.name_en || "",
      domicile: String(rate.domicile ?? 0),
      bureau: String(rate.bureau ?? 0),
    });
    setEditError("");
  }

  function cancelEdit() {
    setEditingCode(null);
    setEditForm({ nameAr: "", nameFr: "", nameEn: "", domicile: "", bureau: "" });
    setEditError("");
  }

  function handleUpdateWilaya() {
    setEditError("");
    if (!editForm.nameAr.trim() || !editForm.nameFr.trim() || !editForm.nameEn.trim()) {
      setEditError(tx.admin("all_names_required"));
      return;
    }
    const domicile = Number(editForm.domicile);
    const bureau = Number(editForm.bureau);
    if (!Number.isFinite(domicile) || domicile < 0 || !Number.isFinite(bureau) || bureau < 0) {
      setEditError(tx.admin("invalid_prices"));
      return;
    }

    startUpdate(async () => {
      try {
        const res = await fetch("/api/admin/shipping", {
          method: "PATCH",
          headers: await csrfHeaders({ "Content-Type": "application/json" }),
          body: JSON.stringify({
            wilaya_code: Number(editingCode),
            wilaya_name: editForm.nameAr.trim(),
            name_fr: editForm.nameFr.trim(),
            name_en: editForm.nameEn.trim(),
            price_home: domicile,
            price_desk: bureau,
          }),
        });

        if (res.ok) {
          // Update local state
          setRates(prev => prev.map(r =>
            r.code === editingCode
              ? {
                  ...r,
                  nameAr: editForm.nameAr.trim(),
                  name: editForm.nameFr.trim(),
                  name_en: editForm.nameEn.trim(),
                  domicile,
                  bureau,
                }
              : r
          ));
          cancelEdit();
        } else {
          const error = await res.json();
          setEditError(error.error || tx.admin("update_wilaya_failed"));
        }
      } catch {
        setEditError(tx.admin("server_error"));
      }
    });
  }

  function handleDeleteWilaya(code: number | string) {
    if (!confirm(tx.admin("confirm_delete_wilaya"))) return;

    startSave(async () => {
      try {
        const res = await fetch(`/api/admin/shipping?code=${code}`, {
          method: "DELETE",
          headers: await csrfHeaders(),
        });

        if (res.ok) {
          setRates(prev => prev.filter(r => r.code !== code));
        } else {
          alert(tx.admin("delete_wilaya_failed"));
        }
      } catch {
        alert(tx.admin("server_error"));
      }
    });
  }

  return (
    <div className="p-6 lg:p-10" dir={dir}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{tx.admin("shipping_title")}</h1>
          <p className="text-gray-500 mt-1">{tx.admin("shipping_subtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm bg-emerald-600 text-white hover:bg-emerald-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            {tx.admin("add_wilaya")}
          </button>
          <RefreshButton
            onRefresh={async () => {
              const res = await fetch("/api/shipping-rates");
              if (res.ok) {
                const data = await res.json();
                if (data.rates) {
                  setRates(data.rates.map((r: RawShippingRate) => ({
                    code: r.code || r.wilaya_code,
                    wilaya_code: Number(r.code || r.wilaya_code),
                    nameAr: r.nameAr || r.wilaya_name_ar || r.wilaya_name || tx.admin("wilaya_name").replace("{code}", String(r.code || r.wilaya_code)),
                    name: r.name || r.wilaya_name_fr || r.name_fr || `Wilaya ${r.code || r.wilaya_code}`,
                    name_en: r.name_en || r.wilaya_name_en || r.name_fr || `Wilaya ${r.code || r.wilaya_code}`,
                    domicile: r.price_home ?? r.domicile ?? 0,
                    bureau: r.price_desk ?? r.bureau ?? 0,
                    is_deliverable: r.is_deliverable ?? true,
                  })));
                }
              }
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
              saved ? "bg-[#D4AF37] text-black" : "bg-[#D4AF37] text-black hover:bg-[#c29c2d]"
            }`}
          >
            <Save className="w-4 h-4" />
            {saving ? tx.admin("saving") : saved ? tx.admin("saved") : tx.admin("save_all_changes")}
          </button>
        </div>
      </div>

      {/* Add wilaya form */}
      {showAddForm && (
        <div className="bg-[#111118] border border-emerald-500/30 rounded-2xl p-6 mb-6">
          <h3 className="text-emerald-400 font-semibold text-lg mb-4">{tx.admin("add_new_wilaya")}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-gray-400 text-xs mb-1">{tx.admin("wilaya_code")}</label>
              <input
                type="number"
                value={newWilaya.code}
                onChange={e => setNewWilaya(prev => ({ ...prev, code: e.target.value }))}
                placeholder="59"
                className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">{tx.admin("wilaya_name_ar")}</label>
              <input
                type="text"
                value={newWilaya.nameAr}
                onChange={e => setNewWilaya(prev => ({ ...prev, nameAr: e.target.value }))}
                placeholder="ولاية جديدة"
                className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                dir="rtl"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">{tx.admin("wilaya_name_fr")}</label>
              <input
                type="text"
                value={newWilaya.nameFr}
                onChange={e => setNewWilaya(prev => ({ ...prev, nameFr: e.target.value }))}
                placeholder="Nouvelle Wilaya"
                className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">{tx.admin("wilaya_name_en")}</label>
              <input
                type="text"
                value={newWilaya.nameEn}
                onChange={e => setNewWilaya(prev => ({ ...prev, nameEn: e.target.value }))}
                placeholder="New Wilaya"
                className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">{tx.admin("home_price")}</label>
              <input
                type="number"
                value={newWilaya.domicile}
                onChange={e => setNewWilaya(prev => ({ ...prev, domicile: e.target.value }))}
                placeholder="700"
                className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-gray-400 text-xs mb-1">{tx.admin("office_price")}</label>
              <input
                type="number"
                value={newWilaya.bureau}
                onChange={e => setNewWilaya(prev => ({ ...prev, bureau: e.target.value }))}
                placeholder="500"
                className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                dir="ltr"
              />
            </div>
          </div>
          {addError && (
            <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2.5 rounded-xl">
              ⚠️ {addError}
            </div>
          )}
          <div className="flex items-center gap-3 mt-4">
            <button
              onClick={handleAddWilaya}
              disabled={adding}
              className="bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all disabled:opacity-60"
            >
              {adding ? tx.admin("adding") : tx.admin("add_wilaya_btn")}
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewWilaya({ code: "", nameAr: "", nameFr: "", nameEn: "", domicile: "", bureau: "" });
                setAddError("");
              }}
              className="bg-white/5 text-white px-6 py-2 rounded-xl text-sm hover:bg-white/10 transition-all"
            >
              {tx.admin("cancel_wilaya")}
            </button>
          </div>
        </div>
      )}

      {/* Bulk update */}
      <div className="bg-[#111118] border border-[#D4AF37]/20 rounded-2xl p-5 mb-6">
        <p className="text-[#D4AF37] font-semibold text-sm mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          {tx.admin("bulk_title")}
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-gray-400 text-xs mb-1">{tx.admin("home_price")}</label>
            <input
              type="number"
              value={bulkDomicile}
              onChange={e => setBulkDomicile(e.target.value)}
              placeholder="700"
              className="bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-white text-sm w-36 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              dir="ltr"
            />
          </div>
          <div>
            <label className="block text-gray-400 text-xs mb-1">{tx.admin("office_price")}</label>
            <input
              type="number"
              value={bulkBureau}
              onChange={e => setBulkBureau(e.target.value)}
              placeholder="500"
              className="bg-[#1a1a24] border border-white/10 rounded-xl px-3 py-2 text-white text-sm w-36 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
              dir="ltr"
            />
          </div>
          <button
            onClick={applyBulk}
            className="bg-white/5 border border-white/10 text-white px-4 py-2 rounded-xl text-sm hover:bg-white/10 transition-all"
          >
            {tx.admin("apply_all")}
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={tx.admin("search_wilaya")}
          className="w-full bg-[#111118] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
        />
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-white/5 rounded-2xl overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[40px_2fr_1fr_1fr_80px] text-xs text-gray-500 font-semibold px-4 py-3 border-b border-white/5 uppercase tracking-wider">
            <span>#</span><span>{tx.admin("wilaya")}</span>
            <span>{tx.admin("home_col")}</span><span>{tx.admin("office_col")}</span>
            <span></span>
          </div>
          <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
            {filtered.map(rate => {
            // Display wilaya name based on current language
            const displayName = lang === "ar"
              ? rate.nameAr
              : lang === "fr"
                ? (rate.name || rate.nameAr)
                : (rate.name_en || rate.name || rate.nameAr);

            const isEditing = editingCode === rate.code;

            if (isEditing) {
              return (
                <div key={rate.code} className="px-4 py-4 bg-[#1a1a24]">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-white font-semibold text-sm">{tx.admin("edit_wilaya")} #{rate.code}</h4>
                    <button
                      onClick={cancelEdit}
                      className="text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">{tx.admin("wilaya_name_ar")}</label>
                      <input
                        type="text"
                        value={editForm.nameAr}
                        onChange={e => setEditForm(prev => ({ ...prev, nameAr: e.target.value }))}
                        className="w-full bg-[#111118] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                        dir="rtl"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">{tx.admin("wilaya_name_fr")}</label>
                      <input
                        type="text"
                        value={editForm.nameFr}
                        onChange={e => setEditForm(prev => ({ ...prev, nameFr: e.target.value }))}
                        className="w-full bg-[#111118] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">{tx.admin("wilaya_name_en")}</label>
                      <input
                        type="text"
                        value={editForm.nameEn}
                        onChange={e => setEditForm(prev => ({ ...prev, nameEn: e.target.value }))}
                        className="w-full bg-[#111118] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">{tx.admin("home_price")}</label>
                      <input
                        type="number"
                        value={editForm.domicile}
                        onChange={e => setEditForm(prev => ({ ...prev, domicile: e.target.value }))}
                        className="w-full bg-[#111118] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-400 text-xs mb-1">{tx.admin("office_price")}</label>
                      <input
                        type="number"
                        value={editForm.bureau}
                        onChange={e => setEditForm(prev => ({ ...prev, bureau: e.target.value }))}
                        className="w-full bg-[#111118] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
                        dir="ltr"
                      />
                    </div>
                  </div>
                  {editError && (
                    <div className="mb-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs px-3 py-2 rounded-lg">
                      ⚠️ {editError}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleUpdateWilaya}
                      disabled={updating}
                      className="bg-[#D4AF37] text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#c29c2d] transition-all disabled:opacity-60"
                    >
                      {updating ? tx.admin("updating") : tx.admin("update")}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="bg-white/5 text-white px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition-all"
                    >
                      {tx.admin("cancel_wilaya")}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={rate.code} className="grid grid-cols-[40px_2fr_1fr_1fr_80px] items-center px-4 py-3 hover:bg-white/2 transition-colors">
                <span className="text-gray-600 text-xs font-mono">{rate.code}</span>
                <span className="text-white text-sm font-medium">{displayName}</span>
                <input
                  type="number"
                  value={rate.domicile ?? 0}
                  onChange={e => updateRate(rate.code, "domicile", Number(e.target.value))}
                  className="bg-[#1a1a24] border border-white/5 rounded-lg px-2 py-1.5 text-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37]/30"
                  dir="ltr"
                />
                <input
                  type="number"
                  value={rate.bureau ?? 0}
                  onChange={e => updateRate(rate.code, "bureau", Number(e.target.value))}
                  className="bg-[#1a1a24] border border-white/5 rounded-lg px-2 py-1.5 text-white text-sm w-24 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37]/30"
                  dir="ltr"
                />
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditWilaya(rate)}
                    className="text-blue-400 hover:text-blue-300 transition-colors p-2"
                    title={tx.admin("edit_wilaya")}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteWilaya(rate.code)}
                    className="text-red-400 hover:text-red-300 transition-colors p-2"
                    title={tx.admin("delete_wilaya")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}
