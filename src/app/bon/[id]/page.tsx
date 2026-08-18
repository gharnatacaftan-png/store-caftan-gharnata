// Public "bon de commande" page — reachable via the QR code on the printed
// slip. Renders the exact same slip as the admin's print preview so scanning
// the QR shows the identical document. Deliberately public (no auth): the
// delivery agent scans the QR to open this page.
import QRCode from "qrcode";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { dbGetOrderById } from "@/lib/orders-db";
import { getSiteSettings } from "@/lib/settings";
import { socialLinksLine, getActivePhones, getActiveAddresses } from "@/lib/social-links";
import { t, type Lang } from "@/lib/i18n";
import PrintButton from "./PrintButton";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Bon de livraison — قسيمة التوصيل",
};

function fmtDate(locale: string, iso: string) {
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}
function fmtTime(locale: string, iso: string) {
  return new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}
function fmtPrice(locale: string, n: number) {
  return n.toLocaleString(locale);
}

export default async function BonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const orderId = Number(id);
  // dbGetOrderById hits the D1 REST API over the network — if Cloudflare is
  // unreachable (offline dev, transient outage) the raw "fetch failed"
  // TypeError would crash the page. Treat it like a missing order instead so
  // the agent sees a clean slip-not-found screen.
  const [order, settings] = await Promise.all([
    Number.isInteger(orderId)
      ? dbGetOrderById(orderId).catch(() => null)
      : Promise.resolve(null),
    getSiteSettings(),
  ]);

  // The slip must be printed in the language the CUSTOMER used when placing
  // the order (stored on the order record). The ?lang= query param is only a
  // fallback for old orders created before the lang column existed.
  const lang: Lang = order?.lang === "fr" || order?.lang === "en"
    ? order.lang
    : (sp.lang === "fr" || sp.lang === "en" ? sp.lang : "ar");
  const tx = t(lang);
  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US";
  // Active social networks / location (dashboard settings) shown on the slip
  // header — same source of truth as the storefront footer.
  const socialLine = socialLinksLine(settings);
  const activePhones = getActivePhones(settings);
  const phonesLine = (activePhones.length ? activePhones : [settings.phone1]).join(" · ");
  const addressesLine = getActiveAddresses(settings).join(" · ");

  const slip = (children: React.ReactNode) => (
    <main className="min-h-screen bg-[#e9e4d8] py-10 print:bg-white print:p-0 print:m-0 print:min-h-0 bon-slip">
      {/* Compact print layout so the slip always fits on a single A4 page — the
          generous `p-8 sm:p-10` + full-size body text was pushing it to 2 pages.
          Screen rendering is untouched (print-only). */}
      <style>{`
@page { margin: 1.5cm; }
@media print {
  .bon-slip { font-size: 11px; min-height: 0 !important; }
  .bon-slip > div > div { padding: 4px !important; }
  .bon-slip table td, .bon-slip table th { padding: 2px 3px !important; }
  .bon-slip .slip-no-break { page-break-inside: avoid !important; break-inside: avoid !important; }
  .bon-slip img { max-width: 100%; height: auto; }
}
`}</style>
      <div className="max-w-3xl mx-auto bg-white text-black shadow-2xl shadow-black/20 rounded-lg overflow-hidden print:shadow-none print:rounded-none print:max-w-none">
        {children}
      </div>
      <PrintButton label={lang === "ar" ? "طباعة" : lang === "fr" ? "Imprimer" : "Print"} />
    </main>
  );

  if (!order) {
    return slip(
      <div className="p-10 text-center">
        <p className="text-5xl mb-4">📄</p>
        <h1 className="text-2xl font-bold mb-2">{tx.admin("slip_not_found")}</h1>
        <p className="text-gray-500">#ID: {id}</p>
      </div>,
    );
  }

  // Absolute URL for the QR — resolved from the request host.
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
  const origin = host ? `https://${host}` : "";
  const qrTarget = `${origin}/bon/${order.id}?lang=${lang}`;
  const qrUrl = await QRCode.toDataURL(qrTarget, {
    width: 220,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });

  const home = order.shipping_type === "HOME";

  // Nom de la wilaya dans la langue du bon : FR/EN depuis la table
  // shipping_rates (colonnes name_fr/name_en), repli sur le nom arabe.
  const wilayaDisplay =
    (lang === "fr" ? order.wilaya_name_fr : lang === "en" ? (order.wilaya_name_en || order.wilaya_name_fr) : null) ||
    order.wilaya_name ||
    tx.admin("wilaya_ref").replace("{code}", String(order.wilaya_code));

  // Line items for the table — from order_items when present, otherwise a
  // synthetic single line rebuilt from the legacy header columns.
  const lines = (order.items && order.items.length > 0 ? order.items : [{
    id: 0,
    product_id: order.product_id,
    title: order.product_title ?? null,
    selected_size: order.selected_size,
    selected_color: order.selected_color,
    quantity: 1,
    unit_price: order.product_price,
  }]);

  return slip(
    <div className="p-8 sm:p-10" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Store header */}
      <div className="flex items-center gap-4 border-b-2 border-[#D4AF37] pb-4 mb-5 slip-no-break">
        <img src="/logo.jpg" alt="logo" className="w-16 h-16 object-contain" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {tx.admin("brand")} <span className="text-[#D4AF37]">·</span> Caftan Gharnata
          </h1>
          <p className="text-sm text-gray-600 mt-0.5">{tx.admin("store_tagline")}</p>
          <p className="text-sm text-gray-600 mt-0.5">
            {tx.admin("contact_label")} <span className="font-mono">{phonesLine}</span>
            {socialLine && <>{" · "}{socialLine}</>}
            {" · "}
            {tx.admin("deliverable")}
          </p>
          {addressesLine && (
            <p className="text-sm text-gray-600 mt-0.5">{addressesLine}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-[#D4AF37]">{tx.admin("bon_delivery")}</p>
          <p className="text-sm text-gray-800 mt-1">N°: <b>#{order.id}</b></p>
          <p className="text-sm text-gray-800">{fmtDate(locale, order.created_at)}</p>
        </div>
      </div>

      {/* Recipient + delivery */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 slip-no-break">
        <div className="border border-gray-300 rounded-lg p-4">
          <p className="text-xs font-bold text-[#D4AF37] mb-2 uppercase tracking-wide">{tx.admin("recipient")}</p>
          <div className="text-sm text-gray-900 space-y-1">
            <p><span className="text-gray-500">{tx.admin("name")}: </span><span className="font-bold">{order.customer_name}</span></p>
            <p><span className="text-gray-500">{tx.admin("phone")}: </span><span dir="ltr">{order.customer_phone}</span></p>
            <p><span className="text-gray-500">{tx.admin("commune")}: </span><span className="font-bold">{order.commune}</span></p>
            <p><span className="text-gray-500">{tx.admin("wilaya")}: </span><span className="font-bold">{wilayaDisplay}</span></p>
          </div>
        </div>
        <div className="border border-gray-300 rounded-lg p-4">
          <p className="text-xs font-bold text-[#D4AF37] mb-2 uppercase tracking-wide">{tx.admin("delivery")}</p>
          <div className="text-sm text-gray-900 space-y-1">
            <p>{home ? tx.admin("home_delivery") : tx.admin("office_pickup")}</p>
            <p>{tx.admin("cod_payment")}</p>
            <p>{fmtDate(locale, order.created_at)} · {fmtTime(locale, order.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Product table */}
      <table className="w-full text-sm mb-5 slip-no-break border border-gray-300 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-900 text-white">
            <th className="p-3 text-right">{tx.admin("product")}</th>
            <th className="p-3 text-center">{tx.admin("size")}</th>
            <th className="p-3 text-center">{tx.admin("color")}</th>
            <th className="p-3 text-center">{tx.admin("quantity")}</th>
            <th className="p-3 text-center">{tx.common("price")}</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, i) => (
            <tr key={i} className="border-t border-gray-200">
              <td className="p-3">
                <p className="font-bold">{line.title || tx.admin("product_ref").replace("{id}", String(line.product_id))}</p>
                <p className="text-xs text-gray-500">#ID: {line.product_id}</p>
              </td>
              <td className="p-3 text-center">{line.selected_size || "—"}</td>
              <td className="p-3 text-center">{line.selected_color || "—"}</td>
              <td className="p-3 text-center">{line.quantity}</td>
              <td className="p-3 text-center font-bold">{fmtPrice(locale, line.unit_price * line.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-5 slip-no-break">
        <div className="w-full sm:w-3/5 border border-gray-300 rounded-lg p-4 text-sm text-gray-900">
          <div className="flex justify-between py-1"><span>{tx.admin("product_price")}:</span><b>{fmtPrice(locale, order.product_price)} {tx.common("currency")}</b></div>
          <div className="flex justify-between py-1"><span>{tx.admin("shipping_cost")}:</span><b>{fmtPrice(locale, order.shipping_cost)} {tx.common("currency")}</b></div>
          <div className="flex justify-between py-2 border-t-2 border-[#D4AF37] mt-1 font-bold text-base">
            <span>{tx.admin("total_due")}:</span><span className="text-[#D4AF37]">{fmtPrice(locale, order.total_price)} {tx.common("currency")}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1 text-center">{tx.admin("cod_payment")}</p>
        </div>
      </div>

      {/* QR + note */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end mb-5 slip-no-break">
        <div className="border border-gray-300 rounded-lg p-3 text-center shrink-0">
          <img src={qrUrl} alt="QR Code" className="w-28 h-28 mx-auto" />
          <p className="text-[10px] text-gray-500 mt-1 max-w-[130px]">{tx.admin("scan_qr_hint")}</p>
        </div>
        <div className="text-xs text-gray-600 space-y-2">
          <p>{tx.admin("thanks_note")}</p>
          <p className="font-semibold text-gray-900">{tx.admin("confirm_receipt")}: <span className="ml-2 inline-block w-5 h-5 border border-gray-400 rounded align-middle" /></p>
        </div>
      </div>

      {/* Signatures — label text removed, only the signing line stays */}
      <div className="flex gap-10 justify-between mt-10 text-sm text-gray-800 slip-no-break">
        <div className="flex-1 text-center">
          <div className="border-t border-gray-900 pt-2">&nbsp;</div>
        </div>
        <div className="flex-1 text-center">
          <div className="border-t border-gray-900 pt-2">&nbsp;</div>
        </div>
      </div>
    </div>,
  );
}
