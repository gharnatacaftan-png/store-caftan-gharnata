"use client";

import { AlertTriangle, X, Trash2 } from "lucide-react";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";

interface ConfirmProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  variant = "danger",
  onConfirm,
  onClose,
}: ConfirmProps) {
  const { lang, dir } = useLang();
  const tx = t(lang);
  if (!isOpen) return null;

  const accent =
    variant === "danger"
      ? { ring: "border-red-500/30", icon: "bg-red-500/10 text-red-400", btn: "bg-red-500 hover:bg-red-600 text-white shadow-red-500/20" }
      : { ring: "border-[#D4AF37]/30", icon: "bg-[#D4AF37]/10 text-[#D4AF37]", btn: "bg-[#D4AF37] hover:bg-[#c29c2d] text-black shadow-[#D4AF37]/20" };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      dir={dir}
      onClick={onClose}
    >
      <div
        className={`bg-[#111118] border ${accent.ring} rounded-3xl max-w-sm w-full p-7 shadow-2xl`}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + title */}
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${accent.icon}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-white font-bold text-lg leading-tight">{title}</h3>
          <button
            onClick={onClose}
            className="mr-auto p-1.5 rounded-xl text-gray-500 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-gray-400 text-sm leading-relaxed mb-6">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm transition-all shadow-lg ${accent.btn}`}
          >
            <Trash2 className="w-4 h-4" />
            {confirmLabel || tx.admin("confirm")}
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl font-semibold text-sm bg-white/5 hover:bg-white/10 text-gray-300 transition-colors"
          >
            {tx.admin("cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
