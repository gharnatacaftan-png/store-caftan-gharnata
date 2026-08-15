import type { Metadata } from "next";
import { cookies } from "next/headers";
import Script from "next/script";
import { Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import SiteChrome from "@/components/SiteChrome";
import type { Lang } from "@/lib/i18n";

const notoArabic = Noto_Sans_Arabic({
  variable: "--font-noto-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://www.caftan-gharnata.com";
const SITE_NAME = "قفطان غرناطة | Caftan Gharnata";
const SITE_DESCRIPTION =
  "قفطان غرناطة — متجر القفطان الجزائري الأصيل. اكتشفي أرقى التصاميم من قفطان، كابيل، بلوزة وهرانية، كراكو وجلابيب زواج وأفراح. توصيل لجميع ولايات الجزائر. Robes traditionnelles algériennes : caftan, robe kabyle, blouza oranaise, karakou — livraison partout en Algérie.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | قفطان غرناطة`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "قفطان جزائري", "caftan algérien", "قفطان غرناطة", "caftan gharnata",
    "رداء عروس جزائري", "blouza oranaise", "robe kabyle", "كابيل",
    "كراكو", "karakou", "جلباب", "قفطان زفاف", "robes traditionnelles algériennes",
    "caftan mariage algérie", "قفطان مطرز", "تطريز جزائري", "caftan brodé",
    "متجر قفطان", "boutique caftan algérie", "قفطان بالذهب",
    "robe de mariée algérienne", "قفطان حفلات", "caftan fête algérie",
    "عين بنيان", "ain benian", "الجزائر العاصمة", "alger", "gharnata",
  ],
  authors: [{ name: "Caftan Gharnata", url: SITE_URL }],
  creator: "Caftan Gharnata",
  publisher: "Caftan Gharnata",
  category: "fashion",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "ar_DZ",
    alternateLocale: ["fr_DZ", "en_US"],
    url: SITE_URL,
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: "قفطان غرناطة — Caftan Gharnata",
        type: "image/jpeg",
      },
      {
        url: `${SITE_URL}/logo.jpg`,
        width: 600,
        height: 600,
        alt: "قفطان غرناطة — Caftan Gharnata",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [`${SITE_URL}/og-image.jpg`],
    creator: "@CaftanGharnata",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icon.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/favicon.ico",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: SITE_URL,
    languages: {
      "ar-DZ": `${SITE_URL}?lang=ar`,
      "fr-DZ": `${SITE_URL}?lang=fr`,
    },
  },
  verification: {
    // Add your Google Search Console verification code here when ready:
    // google: "YOUR_GOOGLE_VERIFICATION_CODE",
  },
  other: {
    "geo.region": "DZ",
    "geo.placename": "Alger, Algérie",
    "geo.position": "36.5225;2.8722",
    "ICBM": "36.5225, 2.8722",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // `maximumScale` is intentionally omitted so mobile users can pinch-to-zoom
  // product photos (lightbox) on the store product page.
};

// Language is persisted as a cookie (written by LangProvider on every pick), so
// the server can render <html lang/dir> correctly on the very first response —
// no Arabic → chosen-language flash on refresh.
function resolveLang(v: string | undefined): Lang {
  return v === "fr" || v === "en" || v === "ar" ? v : "ar";
}

// Language bootstrap. React warns when a raw <script> is rendered from a
// component (scripts are never executed that way on the client). `next/script`
// with `beforeInteractive` injects the inline script into the initial HTML and
// runs it before hydration, without triggering the warning.
// The script applies the persisted language (localStorage, fallback cookie)
// BEFORE the first paint so there is no Arabic → chosen-language flash.
// suppressHydrationWarning absorbs the html/lang/dir attribute mismatch.
const LANG_BOOTSTRAP = `(function(){try{var s=null,c=null;try{s=localStorage.getItem('caftan_lang')}catch(e){}var m=document.cookie.match(/(?:^|; )caftan_lang=([^;]+)/);if(m)c=m[1];var l=s||c||'ar';if(l!=='fr'&&l!=='en'&&l!=='ar')l='ar';document.documentElement.lang=l;document.documentElement.dir=(l==='ar'?'rtl':'ltr');if(s&&s!==c){document.cookie='caftan_lang='+s+';path=/;max-age=31536000;SameSite=Lax'+(location.protocol==='https:'?';Secure':'')}}catch(e){}})()`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialLang: Lang = "ar";
  try {
    const store = await cookies();
    initialLang = resolveLang(store.get("caftan_lang")?.value);
  } catch {
    // cookies() unavailable in this context — fall back to Arabic.
  }

  const dir = initialLang === "ar" ? "rtl" : "ltr";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ClothingStore",
    "name": "قفطان غرناطة - Caftan Gharnata",
    "alternateName": ["Caftan Gharnata", "Gharnata Caftan", "قفطان غرناطة"],
    "url": SITE_URL,
    "logo": `${SITE_URL}/icon.png`,
    "image": `${SITE_URL}/logo.jpg`,
    "description": SITE_DESCRIPTION,
    "telephone": "+213560000000",
    "email": "caftangharnata@gmail.com",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "عين بنيان",
      "addressRegion": "Alger",
      "addressCountry": "DZ",
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "36.5225",
      "longitude": "2.8722",
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Saturday", "Sunday"],
        "opens": "09:00",
        "closes": "21:00",
      },
    ],
    "priceRange": "$$",
    "currenciesAccepted": "DZD",
    "paymentAccepted": "Cash on delivery",
    "areaServed": {
      "@type": "Country",
      "name": "Algeria",
    },
    "hasMap": "https://maps.google.com/?q=36.5225,2.8722",
    "sameAs": [
      "https://www.instagram.com/caftan.gharnata",
      "https://www.facebook.com/caftan.gharnata",
    ],
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${SITE_URL}/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang={initialLang} dir={dir} className={`${notoArabic.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content={SITE_NAME} />
        <meta property="og:description" content={SITE_DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:image:secure_url" content={`${SITE_URL}/og-image.jpg`} />
        <meta property="og:image:type" content="image/jpeg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SITE_NAME} />
        <meta name="twitter:description" content={SITE_DESCRIPTION} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.jpg`} />
        <link rel="preconnect" href="https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev" />
        <Script
          id="lang-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: LANG_BOOTSTRAP }}
        />
        <Script
          id="json-ld-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background font-noto-arabic w-full">
        <SiteChrome initialLang={initialLang}>{children}</SiteChrome>
      </body>
    </html>
  );
}
