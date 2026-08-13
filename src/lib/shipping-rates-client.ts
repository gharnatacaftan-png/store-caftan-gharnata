// Client-side cached fetch for /api/shipping-rates.
// CartDrawer, the product page and the shipping page all need these rates;
// this module guarantees a single network request per browser session instead
// of one per component (React StrictMode in dev double-invokes effects, and
// the endpoint is rate-limited → repeated requests could hit HTTP 429).
import { normalizeWilayaCode } from "@/lib/wilayas";

export interface ClientShippingRate {
  price_home: number;
  price_desk: number;
  deliverable?: boolean;
  nameAr?: string;
  nameFr?: string;
  nameEn?: string;
}

export type ClientRateMap = Record<string, ClientShippingRate>;

let sharedPromise: Promise<ClientRateMap> | null = null;

export function fetchShippingRates(): Promise<ClientRateMap> {
  if (!sharedPromise) {
    sharedPromise = fetch("/api/shipping-rates")
      .then((r) => r.json())
      .then((data) => {
        const list = data?.rates || data;
        const map: ClientRateMap = {};
        if (Array.isArray(list)) {
          for (const r of list) {
            // D1 renvoie des codes non paddés ("1"…"9") : on normalise en
            // "01"…"09" pour correspondre aux clés de WILAYAS.
            const code = normalizeWilayaCode(r.wilaya_code ?? r.code);
            if (!code) continue;
            map[code] = {
              price_home: Number(r.price_home ?? r.domicile ?? 0),
              price_desk: Number(r.price_desk ?? r.bureau ?? 0),
              deliverable: r.is_deliverable === undefined ? true : Boolean(r.is_deliverable),
              nameAr: r.wilaya_name ?? r.nameAr,
              nameFr: r.name_fr ?? r.name,
              nameEn: r.name_en,
            };
          }
        }
        return map;
      })
      .catch(() => {
        // On failure, allow a later retry (e.g. next navigation) instead of
        // caching an empty map forever. The callers fall back to the static
        // WILAYAS prices meanwhile.
        sharedPromise = null;
        return {};
      });
  }
  return sharedPromise;
}
