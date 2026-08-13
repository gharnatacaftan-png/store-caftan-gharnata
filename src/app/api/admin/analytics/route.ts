// app/api/admin/analytics/route.ts — Dashboard visit analytics (admin only)
import { d1Query, d1QueryFirst } from "@/lib/db";
import { requireAdminSession, okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";

export async function GET() {
  const session = await requireAdminSession();
  if (!session) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    // Visits today
    const todayRow = await d1QueryFirst<{ today_visits: number }>(
      `SELECT COUNT(*) AS today_visits FROM site_visits WHERE DATE(created_at) = DATE('now')`
    );

    // Unique visitors today
    const uniqueTodayRow = await d1QueryFirst<{ unique_today: number }>(
      `SELECT COUNT(DISTINCT visitor_hash) AS unique_today FROM site_visits WHERE DATE(created_at) = DATE('now')`
    );

    // Monthly visits (this month)
    const monthRow = await d1QueryFirst<{ month_visits: number }>(
      `SELECT COUNT(*) AS month_visits FROM site_visits WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`
    );

    // Total all-time visits
    const totalRow = await d1QueryFirst<{ total: number }>(
      `SELECT COUNT(*) AS total FROM site_visits`
    );

    // Mobile vs Desktop split (last 30 days)
    const deviceRows = await d1Query<{ device_type: string; count: number }>(
      `SELECT device_type, COUNT(*) AS count FROM site_visits WHERE created_at >= DATETIME('now', '-30 days') GROUP BY device_type`
    );

    // Top 5 product pages (last 7 days) — with actual product name from products table.
    // INNER JOIN = only products that STILL EXIST are counted. Stale visit rows
    // left behind by a deleted product must not rank as a "most viewed product".
    const topProducts = await d1Query<{ page_path: string; views: number; product_name: string | null }>(
      `SELECT sv.page_path, COUNT(*) AS views, p.title AS product_name
       FROM site_visits sv
       INNER JOIN products p ON p.id = CAST(REPLACE(sv.page_path, '/product/', '') AS INTEGER)
       WHERE sv.created_at >= DATETIME('now', '-7 days')
         AND sv.page_path LIKE '/product/%'
       GROUP BY sv.page_path
       ORDER BY views DESC
       LIMIT 5`
    );

    // Top pages overall (last 7 days) — exclude 404/error/API/admin paths, join product names.
    // Product paths that point to a deleted product are dropped too (p.id IS NULL).
    const topPages = await d1Query<{ page_path: string; views: number; product_name: string | null }>(
      `SELECT sv.page_path, COUNT(*) AS views, p.title AS product_name
       FROM site_visits sv
       LEFT JOIN products p ON (sv.page_path LIKE '/product/%' AND p.id = CAST(REPLACE(sv.page_path, '/product/', '') AS INTEGER))
       WHERE sv.created_at >= DATETIME('now', '-7 days')
         AND sv.page_path NOT LIKE '/404%'
         AND sv.page_path NOT LIKE '/_not-found%'
         AND sv.page_path NOT LIKE '/api/%'
         AND sv.page_path NOT LIKE '/gharnata-portal-x92%'
         AND (sv.page_path NOT LIKE '/product/%' OR p.id IS NOT NULL)
       GROUP BY sv.page_path
       ORDER BY views DESC
       LIMIT 8`
    );

    // Daily visits for last 14 days (sparkline data)
    const dailyVisits = await d1Query<{ day: string; visits: number }>(
      `SELECT DATE(created_at) AS day, COUNT(*) AS visits FROM site_visits WHERE created_at >= DATETIME('now', '-14 days') GROUP BY DATE(created_at) ORDER BY day ASC`
    );

    // Mobile percentage
    const mobileCount = deviceRows.find(d => d.device_type === "Mobile")?.count ?? 0;
    const totalDevices = deviceRows.reduce((s, d) => s + d.count, 0);
    const mobilePercent = totalDevices > 0 ? Math.round((mobileCount / totalDevices) * 100) : 0;

    return okResponse({
      ok: true,
      todayVisits: todayRow?.today_visits ?? 0,
      uniqueToday: uniqueTodayRow?.unique_today ?? 0,
      monthVisits: monthRow?.month_visits ?? 0,
      totalVisits: totalRow?.total ?? 0,
      mobilePercent,
      topProducts,
      topPages,
      dailyVisits,
    });
  } catch (err) {
    console.error("[analytics GET]", err);
    return errorResponse("Failed to load analytics", 500);
  }
}
