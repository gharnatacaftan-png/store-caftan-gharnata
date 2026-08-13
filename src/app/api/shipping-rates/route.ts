import { dbGetAllRates } from "@/lib/shipping-db";
import { okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";

// Public read of the D1 shipping rates — the single source of truth.
// The /api/orders route charges from this same table, so what the client
// previews is exactly what will be billed.
//
// NOTE: intentionally NOT rate-limited. It is read-only cached data and every
// storefront component (CartDrawer, product page, shipping page) fetches it
// through lib/shipping-rates-client which dedupes to one request per session.
// A rate limit here only produced HTTP 429 errors in the checkout UI.
export async function GET() {
  try {
    const rates = await dbGetAllRates();
    return okResponse({ ok: true, rates }, 200, { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" });
  } catch (err) {
    console.error("[shipping-rates GET]", err);
    return errorResponse("خطأ في جلب أسعار التوصيل", 500);
  }
}
