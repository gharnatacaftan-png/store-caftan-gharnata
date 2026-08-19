"use client";

import { useEffect, useState } from "react";
import RefreshButton from "@/components/admin/RefreshButton";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { LogIn, LogOut, Monitor, Smartphone, Tablet, MapPin, ShieldCheck, ShieldAlert } from "lucide-react";
import { formatDateTime } from "@/lib/time";

interface LoginLog {
  username: string;
  ip: string;
  user_agent: string;
  country: string | null;
  city: string | null;
  browser?: string;
  os?: string;
  deviceType?: "Desktop" | "Mobile" | "Tablet";
  deviceModel?: string;
  device: string;
  success: number;
  created_at: string;
}

interface ApiResponse {
  ok: boolean;
  logs: LoginLog[];
  tableMissing?: boolean;
  error?: string;
}

function DeviceIcon({ type }: { type?: "Desktop" | "Mobile" | "Tablet" }) {
  if (type === "Mobile") return <Smartphone className="w-4 h-4 text-amber-400 shrink-0" />;
  if (type === "Tablet") return <Tablet className="w-4 h-4 text-purple-400 shrink-0" />;
  return <Monitor className="w-4 h-4 text-sky-400 shrink-0" />;
}

export default function LoginLogsClient() {
  const { lang, dir } = useLang();
  const tx = t(lang);
  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US";

  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function formatLocation(country: string | null | undefined, city: string | null | undefined): string {
    const c = country && country !== "--" ? country : null;
    const ci = city && city !== "--" ? city : null;
    if (!c && !ci) return "Inconnu (VPN / Local)";
    if (c && ci) return `${ci}, ${c}`;
    return c || ci || "Inconnu";
  }

  async function fetchLogs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login-logs");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Fetch failed");
      }
      setData(await res.json());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("no such table")) {
        setData({ ok: true, logs: [], tableMissing: true });
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchLogs(); }, []);

  const tableMissing = data?.tableMissing;
  const serverError = data?.error || null;

  return (
    <div className="p-4 sm:p-6 lg:p-10" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">{tx.admin("login_logs_title")}</h1>
            <span className="bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Security Audit
            </span>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">{tx.admin("login_logs_subtitle")}</p>
        </div>
        <RefreshButton onRefresh={fetchLogs} label={tx.admin("login_logs_refresh")} />
      </div>

      {tableMissing && (
        <div className="mb-6 border border-[#D4AF37]/30 bg-[#D4AF37]/10 rounded-2xl p-5">
          <p className="text-[#D4AF37] font-semibold text-sm mb-3">⚠️ {tx.admin("login_logs_table_missing")}</p>
        </div>
      )}

      {serverError && !tableMissing && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          ⚠️ {serverError}
        </div>
      )}

      {error && !tableMissing && !serverError && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-[#111118] border border-white/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/40">
        {loading ? (
          <div className="p-8 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        ) : data && data.logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-gray-400 font-semibold px-4 py-3.5">#</th>
                  <th className="text-gray-400 font-semibold px-4 py-3.5">{tx.admin("login_logs_user")}</th>
                  <th className="text-gray-400 font-semibold px-4 py-3.5">{tx.admin("login_logs_status")}</th>
                  <th className="text-gray-400 font-semibold px-4 py-3.5">{tx.admin("login_logs_ip")}</th>
                  <th className="text-gray-400 font-semibold px-4 py-3.5">{tx.admin("login_logs_location")}</th>
                  <th className="text-gray-400 font-semibold px-4 py-3.5">{tx.admin("login_logs_device")}</th>
                  <th className="text-gray-400 font-semibold px-4 py-3.5">{tx.admin("login_logs_when")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {data.logs.map((log, i) => {
                  const locText = formatLocation(log.country, log.city);
                  const isSuccess = Boolean(log.success);

                  return (
                    <tr key={log.created_at + i} className="hover:bg-white/[0.03] transition-colors group">
                      <td className="text-gray-500 px-4 py-3.5 font-mono text-xs">{i + 1}</td>
                      
                      <td className="px-4 py-3.5">
                        <span className="text-white font-bold">{log.username || "admin"}</span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                            isSuccess
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/10 text-red-400 border-red-500/30"
                          }`}
                        >
                          {isSuccess ? <LogIn className="w-3.5 h-3.5" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                          {isSuccess ? tx.admin("login_logs_success") : tx.admin("login_logs_failure")}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-mono text-xs">
                        <span className="bg-black/40 text-amber-200/90 border border-white/10 px-2.5 py-1 rounded-lg">
                          {log.ip || "—"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-gray-200 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                          <span>{locText}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <DeviceIcon type={log.deviceType} />
                            <span className="text-white font-semibold text-xs sm:text-sm">
                              {log.deviceModel || log.device || "Appareil inconnu"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                            {log.browser && (
                              <span className="bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded-md font-medium">
                                {log.browser}
                              </span>
                            )}
                            {log.os && (
                              <span className="bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 rounded-md font-medium">
                                {log.os}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="text-gray-400 font-mono text-xs px-4 py-3.5 whitespace-nowrap">
                        {formatDateTime(new Date(log.created_at), locale)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-12">{tx.admin("login_logs_no_data")}</p>
        )}
      </div>
    </div>
  );
}
