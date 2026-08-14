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

export const metadata: Metadata = {
  title: "قفطان غرناطة",
  description: "قفطان غرناطة",
  icons: {
    icon: "/icon.png",
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

  return (
    <html lang={initialLang} dir={dir} className={`${notoArabic.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev" />
        <Script
          id="lang-bootstrap"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: LANG_BOOTSTRAP }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background font-noto-arabic w-full">
        <SiteChrome initialLang={initialLang}>{children}</SiteChrome>
      </body>
    </html>
  );
}
