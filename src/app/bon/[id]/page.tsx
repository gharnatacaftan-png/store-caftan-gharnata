// Public "bon de commande" & "bon de livraison" page — reachable via Telegram links or QR code.
// Renders the exact same slips as the admin dashboard (OrdersClient).
import QRCode from "qrcode";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { Printer, Truck } from "lucide-react";
import { dbGetOrderById } from "@/lib/orders-db";
import { getSiteSettings } from "@/lib/settings";
import { socialLinksLine, getActivePhones, getActiveAddresses } from "@/lib/social-links";
import { t, type Lang } from "@/lib/i18n";
import { formatDate, formatTime } from "@/lib/time";
import PrintButton from "./PrintButton";
import AutoPrint from "./AutoPrint";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Bon de livraison — قسيمة التوصيل",
};

function fmtDate(locale: string, iso: string) {
  return formatDate(iso, locale);
}
function fmtTime(locale: string, iso: string) {
  return formatTime(iso, locale);
}
function fmtPrice(locale: string, n: number) {
  return n.toLocaleString(locale);
}

export default async function BonPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string; type?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;

  const orderId = Number(id);
  const [order, settings] = await Promise.all([
    Number.isInteger(orderId)
      ? dbGetOrderById(orderId).catch(() => null)
      : Promise.resolve(null),
    getSiteSettings(),
  ]);

  const lang: Lang = order?.lang === "fr" || order?.lang === "en"
    ? order.lang
    : (sp.lang === "fr" || sp.lang === "en" ? sp.lang : "ar");
  const tx = t(lang);
  const arT = t("ar");
  const locale = lang === "ar" ? "ar-DZ" : lang === "fr" ? "fr-FR" : "en-US";

  const socialLine = socialLinksLine(settings);
  const activePhones = getActivePhones(settings);
  const phonesLine = (activePhones.length ? activePhones : [settings.phone1]).join(" · ");
  const addressesLine = getActiveAddresses(settings).map(a => a.text).join(" · ");

  if (!order) {
    return (
      <main className="min-h-screen bg-[#0e0e16] text-white flex items-center justify-center p-6">
        <div className="bg-[#111118] border border-white/10 rounded-3xl p-8 max-w-sm text-center">
          <p className="text-5xl mb-4">📄</p>
          <h1 className="text-2xl font-bold mb-2">{tx.admin("slip_not_found")}</h1>
          <p className="text-gray-500">#ID: {id}</p>
        </div>
      </main>
    );
  }

  const slipType = sp.type === "commande" || sp.type === "livraison" ? sp.type : null;

  // Absolute URL for the QR — points to the exact current slip type (commande vs livraison)
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host");
  const origin = host ? `https://${host}` : "";
  const qrTypeParam = slipType ? `?type=${slipType}&lang=${lang}` : `?lang=${lang}`;
  const qrTarget = `${origin}/bon/${order.id}${qrTypeParam}`;
  const qrUrl = await QRCode.toDataURL(qrTarget, {
    width: 220,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000000", light: "#ffffff" },
  });

  const home = order.shipping_type === "HOME";
  const wilayaDisplay =
    (lang === "fr" ? order.wilaya_name_fr : lang === "en" ? (order.wilaya_name_en || order.wilaya_name_fr) : null) ||
    order.wilaya_name ||
    tx.admin("wilaya_ref").replace("{code}", String(order.wilaya_code));

  const lines = (order.items && order.items.length > 0 ? order.items : [{
    id: 0,
    product_id: order.product_id,
    title: order.product_title ?? null,
    selected_size: order.selected_size,
    selected_color: order.selected_color,
    quantity: 1,
    unit_price: order.product_price,
  }]);

  const dir = lang === "ar" ? "rtl" : "ltr";

  // --- CHOOSER PAGE (when opening /bon/36 directly without ?type=...) ---
  if (!slipType) {
    return (
      <main className="min-h-screen bg-[#0e0e16] text-white flex items-center justify-center p-6" dir={dir}>
        <div className="w-full max-w-md bg-[#111118] border border-white/10 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          {/* Header */}
          <div className="flex flex-col items-center">
            <img src="/logo.jpg" alt="Caftan Gharnata" className="w-20 h-20 rounded-2xl object-contain mb-3 border border-white/10" />
            <span className="text-[#D4AF37] font-mono text-sm bg-[#D4AF37]/10 px-3 py-1 rounded-full font-bold">
              #{order.id}
            </span>
            <h1 className="text-xl font-bold text-white mt-2">
              {order.customer_name}
            </h1>
          </div>

          {/* Action Buttons matching dashboard design */}
          <div className="flex flex-col gap-3.5 pt-2">
            <a
              href={`/bon/${order.id}?type=commande&lang=${lang}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#D4AF37] hover:bg-[#c29c2d] text-black font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-[#D4AF37]/20 transition-all text-sm"
            >
              <Printer className="w-5 h-5 shrink-0" />
              <span>{lang === "ar" ? "طباعة بون الأمر" : lang === "fr" ? "Imprimer le bon de commande" : "Print Order Slip"}</span>
            </a>
            <a
              href={`/bon/${order.id}?type=livraison&lang=${lang}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#181824] hover:bg-[#222234] border border-[#D4AF37]/40 text-[#D4AF37] font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all text-sm"
            >
              <Truck className="w-5 h-5 shrink-0" />
              <span>{lang === "ar" ? "طباعة قسيمة التوصيل" : lang === "fr" ? "Imprimer le bon de livraison" : "Print delivery slip"}</span>
            </a>
          </div>

          <p className="text-xs text-gray-500 pt-2 border-t border-white/5">
            {tx.admin("scan_qr_hint")}
          </p>
        </div>
      </main>
    );
  }

  // --- PRINTABLE SLIPS (when ?type=commande or ?type=livraison) ---
  // The "bon de livraison" is printed on a thermal label/sticker printer (A6),
  // so it uses a smaller @page + tighter gutters than the A4 "bon de commande".
  const isA6 = slipType === "livraison";
  const pageSize = isA6 ? "A6" : "A4 portrait";
  const pageMargin = isA6 ? "0.5cm" : "0";
  const slipPad = isA6 ? "0.5cm" : "1.2cm";
  const bodyFontSize = isA6 ? "10px" : "11px";
  const cellPad = isA6 ? "3px 4px" : "4px 6px";

  const slipWrapper = (content: React.ReactNode) => (
    <main className="min-h-screen bg-[#e9e4d8] py-10 print:bg-white print:p-0 print:m-0 print:min-h-0 bon-slip">
      <style>{`
        @page {
          size: ${pageSize};
          margin: ${pageMargin};
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bon-slip {
            font-size: ${bodyFontSize};
            min-height: 0 !important;
            background: white !important;
            padding: ${slipPad} !important;
            margin: 0 !important;
          }
          .bon-slip > div {
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: none !important;
          }
          .bon-slip table td, .bon-slip table th {
            padding: ${cellPad} !important;
          }
          .slip-no-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
      <AutoPrint />
      <div className="max-w-3xl mx-auto bg-white text-black shadow-2xl shadow-black/20 rounded-lg overflow-hidden print:shadow-none print:rounded-none print:max-w-none">
        {content}
      </div>
      <PrintButton label={lang === "ar" ? "طباعة" : lang === "fr" ? "Imprimer" : "Print"} />
    </main>
  );

  // TYPE 1: BON DE COMMANDE (Order Form)
  if (slipType === "commande") {
    return slipWrapper(
      <div className={isA6 ? "p-3 sm:p-4" : "p-8 sm:p-10"} dir={dir}>
        {/* Store header */}
        <div className="flex items-center gap-4 border-b-2 border-[#D4AF37] pb-4 mb-5 slip-no-break">
          <img src="/logo.jpg" alt="logo" className="w-16 h-16 object-contain" />
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">
              {tx.admin("brand")} <span className="text-[#D4AF37]">·</span> Caftan Gharnata
            </h1>
            <p className="text-xs text-gray-600 mt-0.5">{tx.admin("store_tagline")}</p>
            <p className="text-xs text-gray-600 mt-0.5">
              {tx.admin("contact_label")} <span className="font-mono">{phonesLine}</span>
              {socialLine && <>{" · "}{socialLine}</>}
              {" · "}
              {tx.admin("deliverable")}
            </p>
            {addressesLine && (
              <p className="text-xs text-gray-600 mt-0.5">{addressesLine}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-[#D4AF37]">{lang === "ar" ? "بون الأمر" : lang === "fr" ? "Bon de commande" : "Order Form"}</p>
            <p className="text-xs text-gray-800 mt-1">N°: <b>#{order.id}</b></p>
            <p className="text-xs text-gray-800">{fmtDate(locale, order.created_at)}</p>
          </div>
        </div>

        {/* Recipient + delivery */}
        <div className="grid grid-cols-2 gap-4 mb-5 slip-no-break">
          <div className="border border-gray-300 rounded-lg p-3">
            <p className="text-xs font-bold text-[#D4AF37] mb-1.5 uppercase tracking-wide">{tx.admin("recipient")}</p>
            <div className="text-xs text-gray-900 space-y-1">
              <p><span className="text-gray-500">{tx.admin("name")}: </span><span className="font-bold">{order.customer_name}</span></p>
              <p><span className="text-gray-500">{tx.admin("phone")}: </span><span dir="ltr">{order.customer_phone}</span></p>
              <p><span className="text-gray-500">{tx.admin("commune")}: </span><span className="font-bold">{order.commune}</span></p>
              <p><span className="text-gray-500">{tx.admin("wilaya")}: </span><span className="font-bold">{wilayaDisplay}</span></p>
            </div>
          </div>
          <div className="border border-gray-300 rounded-lg p-3">
            <p className="text-xs font-bold text-[#D4AF37] mb-1.5 uppercase tracking-wide">{tx.admin("delivery")}</p>
            <div className="text-xs text-gray-900 space-y-1">
              <p>{home ? tx.admin("home_delivery") : tx.admin("office_pickup")}</p>
              <p>{tx.admin("cod_payment")}</p>
              <p>{fmtDate(locale, order.created_at)} · {fmtTime(locale, order.created_at)}</p>
            </div>
          </div>
        </div>

        {/* Product table */}
        <table className="w-full text-xs mb-5 slip-no-break border border-gray-300 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-900 text-white">
              <th className="p-2.5 text-right">{tx.admin("product")}</th>
              <th className="p-2.5 text-center">{tx.admin("size")}</th>
              <th className="p-2.5 text-center">{tx.admin("color")}</th>
              <th className="p-2.5 text-center">{tx.admin("quantity")}</th>
              <th className="p-2.5 text-center">{tx.common("price")}</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, i) => (
              <tr key={i} className="border-t border-gray-200">
                <td className="p-2.5">
                  <p className="font-bold">{line.title || tx.admin("product_ref").replace("{id}", String(line.product_id))}</p>
                  <p className="text-[10px] text-gray-500">#ID: {line.product_id}</p>
                </td>
                <td className="p-2.5 text-center">{line.selected_size || "—"}</td>
                <td className="p-2.5 text-center">{line.selected_color || "—"}</td>
                <td className="p-2.5 text-center">{line.quantity}</td>
                <td className="p-2.5 text-center font-bold">{fmtPrice(locale, line.unit_price * line.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end mb-5 slip-no-break">
          <div className="w-1/2 border border-gray-300 rounded-lg p-3 text-xs text-gray-900">
            <div className="flex justify-between py-1"><span>{tx.admin("product_price")}:</span><b>{fmtPrice(locale, order.product_price)} {tx.common("currency")}</b></div>
            <div className="flex justify-between py-1"><span>{tx.admin("shipping_cost")}:</span><b>{fmtPrice(locale, order.shipping_cost)} {tx.common("currency")}</b></div>
            <div className="flex justify-between py-1.5 border-t-2 border-[#D4AF37] mt-1 font-bold text-sm">
              <span>{tx.admin("total_due")}:</span><span className="text-[#D4AF37]">{fmtPrice(locale, order.total_price)} {tx.common("currency")}</span>
            </div>
            <p className="text-[10px] text-gray-500 mt-1 text-center">{tx.admin("cod_payment")}</p>
          </div>
        </div>

        {/* QR + note */}
        <div className="flex gap-4 items-end mb-5 slip-no-break">
          <div className="border border-gray-300 rounded-lg p-2.5 text-center shrink-0">
            <img src={qrUrl} alt="QR Code" className="w-24 h-24 mx-auto" />
            <p className="text-[9px] text-gray-500 mt-1 max-w-[110px]">{tx.admin("scan_qr_hint")}</p>
          </div>
          <div className="text-xs text-gray-600 space-y-2 flex-1">
            <p>{tx.admin("thanks_note")}</p>
            <p className="font-semibold text-gray-900">{tx.admin("confirm_receipt")}: <span className="ml-2 inline-block w-4 h-4 border border-gray-400 rounded align-middle" /></p>
          </div>
        </div>

        {/* Signatures */}
        <div className="flex gap-10 justify-between mt-8 text-xs text-gray-800 slip-no-break">
          <div className="flex-1 text-center">
            <div className="border-t border-gray-900 pt-1">&nbsp;</div>
          </div>
          <div className="flex-1 text-center">
            <div className="border-t border-gray-900 pt-1">&nbsp;</div>
          </div>
        </div>
      </div>
    );
  }

  // TYPE 2: COMPACT BON DE LIVRAISON (A6 — thermal label printer, single page).
  // The delivery slip prints on one A6 sticker: tight gutters, tiny fonts, and a
  // compact 2-col recipient grid. Product name is always Arabic.
  return slipWrapper(
    <div className="p-2" dir="ltr">
      {/* Header: store + order meta */}
      <div className="flex items-center justify-between border-b border-[#D4AF37] pb-1 mb-2 slip-no-break">
        <div className="flex items-center gap-1.5">
          <img src="/logo.jpg" alt="logo" className="w-6 h-6 object-contain" />
          <span className="font-bold text-[9px] text-gray-900">
            Caftan Gharnata · <span lang="ar" dir="rtl">قفطان غرناطة</span>
          </span>
        </div>
        <div className="text-right text-[7.5px] text-gray-800">
          <div className="font-bold">قسيمة توصيل / Bon de livraison</div>
          <div>N°: <b>#{order.id}</b></div>
          <div>{formatDate(order.created_at, "fr-FR")}</div>
        </div>
      </div>

      {/* Recipient (compact 2-col) */}
      <div className="grid grid-cols-2 gap-x-1 text-[7px] text-gray-800 mb-2 slip-no-break">
        <div>الاسم: <b>{order.customer_name}</b></div>
        <div>الهاتف: <b className="font-mono" dir="ltr">{order.customer_phone}</b></div>
        <div>البلدية: <b>{order.commune}</b></div>
        <div>الولاية: <b>{wilayaDisplay}</b></div>
        <div>نوع التوصيل: <b>{home ? "المنزل" : "مكتب البريد"}</b></div>
        <div>الدفع: <b>نقداً عند الاستلام</b></div>
      </div>

      {/* Products (compact) */}
      <div className="border-t border-b border-gray-300 py-1 mb-2 slip-no-break">
        {lines.map((line, i) => (
          <div key={i} className={i > 0 ? "mt-1 border-t border-gray-200 pt-1" : ""}>
            <div className="font-bold text-[7.5px] text-gray-900">{line.title || `#${line.product_id}`}</div>
            <div className="text-[6.5px] text-gray-500">
              #{line.product_id} · المقاس: {line.selected_size || "—"} · اللون: {line.selected_color || "—"}
            </div>
            <div className="flex justify-between text-[7.5px] mt-0.5">
              <span>× {line.quantity}</span>
              <b>{fmtPrice("ar-DZ", line.unit_price * line.quantity)} د.ج</b>
            </div>
          </div>
        ))}
      </div>

      {/* Totals + QR */}
      <div className="flex items-end gap-2 slip-no-break">
        <div className="flex-1 text-[7px]">
          <div className="flex justify-between">السعر: <b>{fmtPrice("ar-DZ", order.product_price)} د.ج</b></div>
          <div className="flex justify-between">التوصيل: <b>{fmtPrice("ar-DZ", order.shipping_cost)} د.ج</b></div>
          <div className="flex justify-between font-bold border-t border-[#D4AF37] pt-0.5 mt-0.5 text-[#D4AF37]">
            المجموع: <span>{fmtPrice("ar-DZ", order.total_price)} د.ج</span>
          </div>
        </div>
        <div className="text-center shrink-0">
          <img src={qrUrl} alt="QR" className="w-13 h-13 mx-auto" />
          <p className="text-[6px] text-gray-500 max-w-[42px] leading-tight">{arT.admin("scan_qr_hint")}</p>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-1 text-[6px] text-center border-t border-gray-400 pt-0.5 mt-1 slip-no-break">
        <div className="border-t border-gray-400 pt-0.5">مربع الاستلام</div>
        <div className="border-t border-gray-400 pt-0.5">التوقيع</div>
      </div>
    </div>
  );
}
