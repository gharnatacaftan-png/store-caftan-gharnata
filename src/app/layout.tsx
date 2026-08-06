import type { Metadata } from "next";
import { Amiri } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "قفطان غرناطة | أصالة تتوارثها الأجيال",
  description: "متجر قفطان غرناطة للألبسة التقليدية الفاخرة.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${amiri.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background font-amiri w-full">
        <Header />
        <main className="flex-1 flex flex-col w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
