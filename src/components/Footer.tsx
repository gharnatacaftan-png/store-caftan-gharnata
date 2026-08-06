"use client";

import Link from "next/link";
import { Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";

export default function Footer() {
  return (
    <footer className="bg-primary text-white pt-12 pb-8 border-t-4 border-accent">
      <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 mb-10">
        {/* About */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-xl md:text-2xl font-bold text-accent mb-4">قفطان غرناطة</h3>
          <p className="text-gray-300 leading-relaxed mb-6 text-sm md:text-base">
            أصالة تتوارثها الأجيال. متجر قفطان غرناطة يقدم أرقى تشكيلة من الألبسة التقليدية الفاخرة للعروس الجزائرية والمناسبات الخاصة.
          </p>
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-all duration-300" aria-label="Facebook">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-all duration-300" aria-label="Instagram">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
            </a>
          </div>
        </motion.div>

        {/* Quick Links */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h3 className="text-lg md:text-xl font-bold text-accent mb-4">روابط سريعة</h3>
          <ul className="space-y-3">
            <li><Link href="/" className="text-gray-300 hover:text-accent transition-colors duration-200 text-sm md:text-base">الرئيسية</Link></li>
            <li><Link href="/shop" className="text-gray-300 hover:text-accent transition-colors duration-200 text-sm md:text-base">المتجر</Link></li>
            <li><Link href="/shipping" className="text-gray-300 hover:text-accent transition-colors duration-200 text-sm md:text-base">سياسة التوصيل والاسترجاع</Link></li>
          </ul>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h3 className="text-lg md:text-xl font-bold text-accent mb-4">معلومات الاتصال</h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-gray-300 text-sm md:text-base">
              <MapPin className="text-accent shrink-0" size={18} />
              <span>الجزائر العاصمة، الجزائر</span>
            </li>
            <li className="flex items-center gap-3 text-gray-300 text-sm md:text-base">
              <Phone className="text-accent shrink-0" size={18} />
              <span dir="ltr">05XX XX XX XX</span>
            </li>
          </ul>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 border-t border-white/10 pt-6 text-center text-gray-500 text-xs md:text-sm">
        <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()} قفطان غرناطة.</p>
      </div>
    </footer>
  );
}
