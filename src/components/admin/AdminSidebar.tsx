"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/gharnata-portal-x92/actions";
import {
  LayoutDashboard, Package, ShoppingBag, Truck, Settings, LogOut, X, Menu, HardDrive, BarChart2, Languages, Images
} from "lucide-react";
import { useState } from "react";
import { useLang } from "@/hooks/useLang";
import { t, LANGUAGES } from "@/lib/i18n";
import type { Lang } from "@/lib/i18n";

function LanguageSwitcher({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-black/30 border border-white/10 p-1">
      <Languages className="w-4 h-4 text-[#D4AF37]/70 shrink-0 mx-1" />
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          onClick={() => setLang(l.code as Lang)}
          className={`flex-1 text-[11px] font-bold rounded-lg px-2 py-1.5 transition-all ${
            lang === l.code
              ? "bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20"
              : "text-gray-400 hover:text-white hover:bg-white/5"
          }`}
          title={l.label}
        >
          {l.label}
        </button>
      ))}
    </div>
  );
}

function NavContent({
  tx,
  pathname,
  onNavigate,
  lang,
  setLang,
}: {
  tx: ReturnType<typeof t>;
  pathname: string;
  onNavigate: () => void;
  lang: Lang;
  setLang: (l: Lang) => void;
}) {
  const navItems = [
    { href: "/gharnata-portal-x92",         label: tx.admin("overview"),       icon: LayoutDashboard },
    { href: "/gharnata-portal-x92/orders",  label: tx.admin("orders"),         icon: ShoppingBag },
    { href: "/gharnata-portal-x92/products",label: tx.admin("products"),       icon: Package },
    { href: "/gharnata-portal-x92/gallery", label: tx.admin("media_gallery"),  icon: Images },
    { href: "/gharnata-portal-x92/shipping",label: tx.admin("shipping_rates"), icon: Truck },
    { href: "/gharnata-portal-x92/analytics",label: tx.admin("analytics"),     icon: BarChart2 },
    { href: "/gharnata-portal-x92/cleanup", label: tx.admin("cleanup"),        icon: HardDrive },
    { href: "/gharnata-portal-x92/settings",label: tx.admin("settings"),       icon: Settings },
  ];

  return (
    <>
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 shrink-0 rounded-full overflow-hidden border border-[#D4AF37]/40 shadow-sm">
            <Image src="/logo.jpg" alt="شعار قفطان غرناطة" fill sizes="56px" className="object-cover rounded-full pointer-events-none" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">{tx.admin("brand")}</p>
            <p className="text-[#D4AF37]/50 text-xs">{tx.admin("dashboard")}</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium ${isActive
                  ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
                }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Language + Logout */}
      <div className="px-3 pb-6 space-y-3">
        <LanguageSwitcher lang={lang} setLang={setLang} />
        <form
          action={logoutAction}
          onSubmit={() => sessionStorage.removeItem("gharnata_admin_tab")}
        >
          <button
            type="submit"
            className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm font-medium"
          >
            <LogOut className="w-5 h-5" />
            {tx.admin("logout")}
          </button>
        </form>
      </div>
    </>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const { lang, setLang } = useLang();
  const tx = t(lang);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navContent = (
    <NavContent
      tx={tx}
      pathname={pathname}
      onNavigate={() => setMobileOpen(false)}
      lang={lang}
      setLang={setLang}
    />
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0e0e16] border-l border-white/5 h-screen sticky top-0">
        {navContent}
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden flex items-center justify-between bg-[#0e0e16] border-b border-white/5 px-4 py-3 sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="relative w-12 h-12 shrink-0 overflow-hidden">
            <Image src="/logo.jpg" alt="شعار قفطان غرناطة" fill sizes="64px" className="object-contain pointer-events-none" />
          </div>
          <span className="text-white font-bold text-sm">{tx.admin("dashboard")}</span>
        </div>
        <button onClick={() => setMobileOpen(true)} className="text-gray-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute right-0 top-0 bottom-0 w-72 bg-[#0e0e16] border-l border-white/5 flex flex-col">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 left-4 text-gray-500 hover:text-white">
              <X className="w-6 h-6" />
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </>
  );
}
