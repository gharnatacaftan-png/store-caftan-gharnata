"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";

interface RefreshButtonProps {
  onRefresh?: () => Promise<void> | void;
  label?: string;
  className?: string;
}

export default function RefreshButton({ onRefresh, label, className = "" }: RefreshButtonProps) {
  const router = useRouter();
  const { lang } = useLang();
  const tx = t(lang);
  const [loading, setLoading] = useState(false);

  async function handleRefresh() {
    if (loading) return;
    setLoading(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      router.refresh();
    } catch (err) {
      console.error("[Refresh error]", err);
    } finally {
      setTimeout(() => setLoading(false), 500);
    }
  }

  return (
    <button
      onClick={handleRefresh}
      disabled={loading}
      className={`flex items-center gap-2 bg-[#1A1A24] border border-white/10 hover:border-[#D4AF37]/50 text-white hover:text-[#D4AF37] px-4 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 ${className}`}
      title={tx.admin("refresh")}
    >
      <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#D4AF37]" : ""}`} />
      <span>{loading ? tx.admin("refreshing") : label || tx.admin("refresh")}</span>
    </button>
  );
}
