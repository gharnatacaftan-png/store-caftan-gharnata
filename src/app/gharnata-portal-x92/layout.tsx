import type { Metadata } from "next";
import { cookies } from "next/headers";
import AdminChrome from "@/components/admin/AdminChrome";
import AdminLangProvider from "@/components/admin/AdminLangProvider";
import AdminErrorWrapper from "@/components/AdminErrorWrapper";
import { ADMIN_LANG_COOKIE } from "@/lib/admin-lang-cookie";
import type { Lang } from "@/lib/i18n";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  let initialLang: Lang = "ar";
  try {
    const store = await cookies();
    const v = store.get(ADMIN_LANG_COOKIE)?.value;
    if (v === "fr" || v === "en" || v === "ar") initialLang = v;
  } catch {
    // cookies() unavailable — fall back to Arabic.
  }

  return (
    <AdminLangProvider initialLang={initialLang}>
      <AdminErrorWrapper>
        <AdminChrome>{children}</AdminChrome>
      </AdminErrorWrapper>
    </AdminLangProvider>
  );
}
