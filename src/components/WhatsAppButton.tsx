"use client";

import { MessageCircle } from "lucide-react";

export default function WhatsAppButton() {
  return (
    <a
      href="https://wa.me/213555123456"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 left-5 z-50 bg-[#25D366] text-white p-3 sm:p-4 rounded-full shadow-xl hover:scale-110 transition-transform duration-300 flex items-center justify-center group"
      aria-label="تواصل معنا عبر الواتساب"
    >
      <MessageCircle size={28} className="fill-current" />

      {/* Tooltip — hidden on mobile to avoid overflow */}
      <span className="hidden sm:block absolute left-full ml-4 bg-white text-black px-3 py-1 rounded shadow-lg text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
        تواصل معنا
      </span>
    </a>
  );
}
