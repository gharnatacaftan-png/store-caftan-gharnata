"use client";

import { usePathname } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VisitTracker from "@/components/VisitTracker";
import CartDrawer from "@/components/CartDrawer";
import LanguagePlate from "@/components/LanguagePlate";
import ScrollToTop from "@/components/ScrollToTop";
import { LangProvider } from "@/hooks/useLang";
import { CartProvider } from "@/hooks/useCart";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import type { Lang } from "@/lib/i18n";

export default function SiteChrome({ children, initialLang }: { children: React.ReactNode; initialLang?: Lang }) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/gharnata-portal-x92");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <LangProvider initialLang={initialLang}>
      <CartProvider>
        <ScrollToTop />
        <VisitTracker />
        <Header />
        <main className="flex-1 flex flex-col w-full">
          <PageErrorBoundary>{children}</PageErrorBoundary>
        </main>
        <Footer />
        <CartDrawer />
        <LanguagePlate />
      </CartProvider>
    </LangProvider>
  );
}

