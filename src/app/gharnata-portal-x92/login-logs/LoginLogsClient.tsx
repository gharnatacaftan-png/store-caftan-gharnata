"use client";

import { useEffect, useState } from "react";
import RefreshButton from "@/components/admin/RefreshButton";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { LogIn, LogOut } from "lucide-react";
import { formatDateTime } from "@/lib/time";

interface LoginLog {
  username: string;
  ip: string;
  user_agent: string;
  country: string | null;
  city: string | null;
  device: string;
  success: number;
  created_at: string;
}

interface ApiResponse {
  ok: boolean;
  logs: LoginLog[];
  tableMissing?: boolean;
}

function statusIcon(success: number) {
  return success ? (
    <LogIn className="w-4 h-4 text-emerald-400" />
  ) : (
    <LogOut className="w-4 h-4 text-red-400" />
  );
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
    if (!c && !ci) return "—";
    return c && ci ? `${ci}, ${c}` : (c || ci || "—");
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

  return (
    <div className="p-4 sm:p-6 lg:p-10" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{tx.admin("login_logs_title")}</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">{tx.admin("login_logs_subtitle")}</p>
        </div>
        <RefreshButton onRefresh={fetchLogs} label={tx.admin("login_logs_refresh")} />
      </div>

      {/* Migration banner (mirrors analytics pattern) */}
      {tableMissing && (
        <div className="mb-6 border border-[#D4AF37]/30 bg-[#D4AF37]/10 rounded-2xl p-5">
          <p className="text-[#D4AF37] font-semibold text-sm mb-3">⚠️ {tx.admin("login_logs_table_missing")}</p>
          <pre className="bg-black/40 text-[#D4AF37] text-xs rounded-xl p-4 overflow-x-auto leading-relaxed">{`CREATE TABLE IF NOT EXISTS admin_login_logs (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT    NOT NULL DEFAULT 'admin',
  ip        TEXT,
  user_agent TEXT,
  success    INTEGER NOT NULL DEFAULT 0,
  country    TEXT,
  city       TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_created ON admin_login_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_login_logs_success ON admin_login_logs(success);

-- or run: wrangler d1 migrations apply caftan-gharnata-db --remote
-- (also add country/city via migration 0004 if the table already exists)`}</pre>
        </div>
      )}

      {error && !tableMissing && (
        <div className="mb-6 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl">
          ⚠️ {error}
        </div>
      )}

      <div className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-5 bg-white/5 rounded animate-pulse" style={{ animationDelay: `${i * 40}ms` }} />
            ))}
          </div>
        ) : data && data.logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm text-left">
              <thead>
                <tr className="bg-white/5 border-b border-white/10">
                  <th className="text-gray-400 font-medium px-3 sm:px-4 py-2.5">#</th>
                  <th className="text-gray-400 font-medium px-3 sm:px-4 py-2.5">{tx.admin("login_logs_user")}</th>
                  <th className="text-gray-400 font-medium px-3 sm:px-4 py-2.5">{tx.admin("login_logs_status")}</th>
                   <th className="text-gray-400 font-medium px-3 sm:px-4 py-2.5 hidden md:table-cell">{tx.admin("login_logs_ip")}</th>
                   <th className="text-gray-400 font-medium px-3 sm:px-4 py-2.5 hidden lg:table-cell">{tx.admin("login_logs_location")}</th>
                   <th className="text-gray-400 font-medium px-3 sm:px-4 py-2.5 hidden lg:table-cell">{tx.admin("login_logs_device")}</th>
                   <th className="text-gray-400 font-medium px-3 sm:px-4 py-2.5">{tx.admin("login_logs_when")}</th>
                </tr>
              </thead>
              <tbody>
                {data.logs.map((log, i) => (
                  <tr key={log.created_at + i} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                    <td className="text-gray-500 px-3 sm:px-4 py-2 font-mono">{i + 1}</td>
                    <td className="text-white font-medium px-3 sm:px-4 py-2">{log.username || "admin"}</td>
                    <td className="px-3 sm:px-4 py-2">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium rounded px-2 py-0.5 ${
                        log.success ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}>
                        {statusIcon(log.success)}
                        {log.success ? tx.admin("login_logs_success") : tx.admin("login_logs_failure")}
                      </span>
                    </td>
                    <td className="text-gray-300 font-mono px-3 sm:px-4 py-2 hidden md:table-cell break-all max-w-[140px]">{log.ip || "—"}</td>
                    <td className="text-gray-400 px-3 sm:px-4 py-2 hidden lg:table-cell">{formatLocation(log.country, log.city)}</td>
                    <td className="text-gray-400 px-3 sm:px-4 py-2 hidden lg:table-cell truncate max-w-[220px]" title={log.user_agent}>
                      {log.device || "—"}
                    </td>
                    <td className="text-gray-400 font-mono px-3 sm:px-4 py-2 tabular-nums">
                      {formatDateTime(new Date(log.created_at), locale)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center py-10">{tx.admin("login_logs_no_data")}</p>
        )}
      </div>
    </div>
  );
}
