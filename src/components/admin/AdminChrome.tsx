"use client";

import { usePathname } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { SessionGuard } from "@/components/admin/SessionGuard";
import { useLang } from "@/hooks/useLang";

export default function AdminChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { dir } = useLang();
  const isLoginPage = pathname === "/gharnata-portal-x92/login";

  if (isLoginPage) {
    return <main className="min-h-screen w-full flex-1" dir={dir}>{children}</main>;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col lg:flex-row" dir={dir}>
      <SessionGuard />
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
