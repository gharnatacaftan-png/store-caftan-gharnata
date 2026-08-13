"use client";

import { useState, useEffect } from "react";
import {
  Eye, Users, Calendar, Smartphone, Globe, Package,
  BarChart2, ArrowUp, ArrowDown, Minus, ExternalLink,
} from "lucide-react";
import RefreshButton from "@/components/admin/RefreshButton";
import { useLang } from "@/hooks/useLang";
import { t, type Lang } from "@/lib/i18n";

interface DailyVisit { day: string; visits: number }
interface PageView { page_path: string; views: number; product_name?: string | null }

interface AnalyticsData {
  todayVisits: number;
  uniqueToday: number;
  monthVisits: number;
  totalVisits: number;
  mobilePercent: number;
  topProducts: PageView[];
  topPages: PageView[];
  dailyVisits: DailyVisit[];
}

function Sparkline({ data }: { data: DailyVisit[] }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map(d => d.visits), 1);
  const w = 90, h = 32, pad = 3;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.visits / max) * (h - pad * 2));
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="opacity-70 shrink-0">
      <polyline points={points} fill="none" stroke="#D4AF37" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function KpiCard({
  icon: Icon, label, value, sub, color, trend, sparkData,
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; color: string; trend?: "up" | "down" | "neutral"; sparkData?: DailyVisit[];
}) {
  const TrendIcon = trend === "up" ? ArrowUp : trend === "down" ? ArrowDown : Minus;
  const trendColor = trend === "up" ? "text-[#D4AF37]" : trend === "down" ? "text-red-400" : "text-gray-500";

  return (
    <div className="bg-[#111118] border border-white/5 rounded-2xl p-4 sm:p-5 hover:border-[#D4AF37]/20 transition-all duration-300 group">
      <div className="flex items-center justify-between gap-2">
        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${color} border border-current/20 flex items-center justify-center opacity-80 shrink-0`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        {sparkData && sparkData.length > 0 && <Sparkline data={sparkData} />}
        {trend && !sparkData && (
          <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
          </div>
        )}
      </div>
      <div className="mt-1">
        <p className="text-gray-500 text-xs mb-1">{label}</p>
        <p className="text-white text-xl sm:text-2xl font-bold tabular-nums">{value}</p>
        {sub && <p className="text-gray-600 text-[11px] sm:text-xs mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function PageBar({
  path, views, max, name, lang,
}: {
  path: string;
  views: number;
  max: number;
  name?: string | null;
  lang: Lang;
}) {
  const tx = t(lang);
  const label = name ||
    (path === "/" ? tx.admin("home_page") :
    path === "/shop" ? tx.admin("shop_page") :
    path === "/shipping" ? tx.admin("shipping_page") :
    path.startsWith("/product/") ? tx.admin("product_page").replace("{id}", path.split("/").pop() || "") : path);

  const pct = max > 0 ? Math.round((views / max) * 100) : 0;
  const targetUrl = path; // direct store path e.g. /product/3, /shop, /

  return (
    <a
      href={targetUrl}
      target="_blank"
      rel="noopener noreferrer"
      title={tx.admin("open_in_new").replace("{label}", label)}
      className="block mb-3.5 group cursor-pointer"
    >
      <div className="bg-white/[0.02] hover:bg-white/[0.07] border border-white/5 hover:border-[#D4AF37]/30 rounded-xl p-2.5 sm:p-3 transition-all duration-200">
        <div className="flex items-center justify-between text-xs mb-2 gap-2">
          <span className="text-gray-200 group-hover:text-[#D4AF37] truncate max-w-[62%] sm:max-w-[75%] font-medium flex items-center gap-1.5 transition-colors">
            <span className="truncate">{label}</span>
            <ExternalLink className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#D4AF37] opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
          </span>
          <span className="text-[#D4AF37] font-semibold tabular-nums bg-[#D4AF37]/10 px-2 py-0.5 rounded-md border border-[#D4AF37]/20 text-[11px] sm:text-xs shrink-0">
            {views} {views === 1 ? tx.admin("visit_singular") : tx.admin("visits_plural")}
          </span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden p-[1px]">
          <div
            className="h-full bg-gradient-to-l from-[#D4AF37] to-[#AA7C11] rounded-full transition-all duration-700 shadow-sm shadow-[#D4AF37]/20"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </a>
  );
}

export default function AnalyticsClient() {
  const { lang, dir } = useLang();
  const tx = t(lang);
  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US";

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingTable, setMissingTable] = useState(false);

  async function fetchAnalytics() {
    setLoading(true);
    setError(null);
    setMissingTable(false);
    try {
      const res = await fetch("/api/admin/analytics");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Fetch failed");
      }
      const json = await res.json();
      setData(json);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setMissingTable(msg.includes("no such table"));
      setError(msg.includes("no such table")
        ? tx.admin("visits_table_missing")
        : msg);
    } finally {
      setLoading(false);
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchAnalytics(); }, []);

  const maxPageViews = Math.max(...(data?.topPages?.map(p => p.views) ?? [1]), 1);

  return (
    <div className="p-4 sm:p-6 lg:p-10" dir={dir}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{tx.admin("analytics_title")}</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-1">{tx.admin("analytics_subtitle")}</p>
        </div>
        <RefreshButton onRefresh={fetchAnalytics} label={tx.admin("refresh_analytics")} />
      </div>

      {/* SQL Setup Banner (shown when table missing) */}
      {error && (
        <div className="mb-6 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-2xl p-5">
          <p className="text-[#D4AF37] font-semibold text-sm mb-3">⚠️ {error}</p>
          {missingTable && (
            <pre className="bg-black/40 text-[#D4AF37] text-xs rounded-xl p-4 overflow-x-auto leading-relaxed">{`CREATE TABLE IF NOT EXISTS site_visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    page_path TEXT NOT NULL,
    visitor_hash TEXT,
    device_type TEXT DEFAULT 'Desktop',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_visits_date ON site_visits(created_at);
CREATE INDEX IF NOT EXISTS idx_visits_path ON site_visits(page_path);`}</pre>
          )}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1,2,3,4].map(i => (
            <div key={i} className="bg-[#111118] rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
            <KpiCard
              icon={Eye}
              label={tx.admin("visits_today")}
              value={data.todayVisits.toLocaleString(locale)}
              color="text-[#D4AF37] bg-[#D4AF37]/10"
              sparkData={data.dailyVisits}
              trend="up"
            />
            <KpiCard
              icon={Users}
              label={tx.admin("unique_today")}
              value={data.uniqueToday.toLocaleString(locale)}
              sub={tx.admin("unique_sub")}
              color="text-[#E5C158] bg-[#E5C158]/10"
              trend="up"
            />
            <KpiCard
              icon={Calendar}
              label={tx.admin("month_visits")}
              value={data.monthVisits.toLocaleString(locale)}
              color="text-[#D4AF37] bg-[#D4AF37]/10"
            />
            <KpiCard
              icon={Smartphone}
              label={tx.admin("mobile_percent")}
              value={`${data.mobilePercent}%`}
              sub={`${100 - data.mobilePercent}% ${tx.admin("desktop_sub")}`}
              color="text-[#B8902B] bg-[#B8902B]/10"
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Top Pages */}
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <Globe className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-white font-semibold text-sm">{tx.admin("top_pages")}</h2>
              </div>
              {data.topPages.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">{tx.admin("no_data")}</p>
              ) : (
                data.topPages.map(p => (
                  <PageBar key={p.page_path} path={p.page_path} views={p.views} max={maxPageViews} name={p.product_name} lang={lang} />
                ))
              )}
            </div>

            {/* Top Products */}
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-5">
                <Package className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-white font-semibold text-sm">{tx.admin("top_products")}</h2>
              </div>
              {data.topProducts.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-6">{tx.admin("no_data")}</p>
              ) : (
                data.topProducts.map(p => (
                  <PageBar key={p.page_path} path={p.page_path} views={p.views} max={data.topProducts[0]?.views ?? 1} name={p.product_name} lang={lang} />
                ))
              )}
            </div>
          </div>

          {/* Daily visits — Horizontal Bar Chart */}
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-2 mb-6">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#D4AF37]" />
                <h2 className="text-white font-semibold text-sm">{tx.admin("daily_visits")}</h2>
              </div>
              <span className="text-gray-400 text-xs bg-white/5 px-3 py-1 rounded-full border border-white/5">
                {tx.admin("total_analytics")} <strong className="text-[#D4AF37] font-semibold tabular-nums">{data.totalVisits.toLocaleString(locale)}</strong> {data.totalVisits === 1 ? tx.admin("visit_singular") : tx.admin("visits_plural")}
              </span>
            </div>
            {data.dailyVisits.length === 0 ? (
              <p className="text-gray-600 text-sm text-center py-6">{tx.admin("no_data")}</p>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const maxV = Math.max(...data.dailyVisits.map(d => d.visits), 1);
                  return data.dailyVisits.slice().reverse().map((d, i) => {
                    const pct = Math.round((d.visits / maxV) * 100);
                    return (
                      <div key={i} className="flex items-center gap-2 sm:gap-3 text-xs group hover:bg-white/[0.02] p-1.5 rounded-lg transition-colors">
                        <span className="w-18 sm:w-24 text-gray-400 font-mono text-[10px] sm:text-[11px] shrink-0 dir-ltr text-right">
                          {d.day}
                        </span>
                        <div className="flex-1 h-2.5 sm:h-3 bg-white/5 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-l from-[#D4AF37] to-[#AA7C11] rounded-full transition-all duration-500 shadow-sm shadow-[#D4AF37]/20 group-hover:from-[#E5C158] group-hover:to-[#D4AF37]"
                            style={{ width: `${Math.max(2, pct)}%` }}
                          />
                        </div>
                        <span className="w-14 sm:w-16 text-left font-medium text-[#D4AF37] tabular-nums shrink-0 text-[11px] sm:text-xs">
                          {d.visits} {d.visits === 1 ? tx.admin("visit_singular") : tx.admin("visits_plural")}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
