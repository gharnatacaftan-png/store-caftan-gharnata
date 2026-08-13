"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label }: { label: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 print:hidden flex items-center gap-2 bg-[#111] text-[#D4AF37] border border-[#D4AF37]/40 px-6 py-3 rounded-full font-bold text-sm shadow-2xl shadow-black/40 hover:bg-black transition-colors"
    >
      <Printer className="w-4 h-4" />
      {label}
    </button>
  );
}
