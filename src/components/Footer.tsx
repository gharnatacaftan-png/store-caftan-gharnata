"use client";

import Link from "next/link";
import { Phone, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import { useSettings } from "@/hooks/useSettings";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { getActiveSocialLinks, getActivePhones, getActiveAddresses, type SocialLink } from "@/lib/social-links";

// Brand icons — Instagram/Facebook are stroked (lucide style), TikTok/X are
// filled brand marks.
function SocialIcon({ network }: { network: SocialLink["network"] }) {
  switch (network) {
    case "whatsapp":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
      );
    case "instagram":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"></line></svg>
      );
    case "facebook":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
      );
    case "tiktok":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>
      );
    case "x":
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
      );
    default:
      return <MapPin size={20} />;
  }
}

export default function Footer() {
  const { settings, loading } = useSettings();
  const { lang } = useLang();
  const tx = t(lang);

  const links = [
    { href: "/",         label: tx.nav("home")     },
    { href: "/shop",     label: tx.nav("shop")     },
    { href: "/shipping", label: tx.nav("shipping") },
  ];

  // Only networks the admin enabled AND filled — same source of truth as the
  // printed order/delivery slips (see lib/social-links). Each active address
  // carries its own map link.
  const socials = getActiveSocialLinks(settings);
  const phones = getActivePhones(settings);
  const addresses = getActiveAddresses(settings);

  const skeleton = (
    <footer className="bg-primary text-white pt-12 pb-8 border-t-4 border-accent">
      <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 mb-10">
        <div>
          <h3 className="text-xl md:text-2xl font-bold text-accent mb-4">{tx.footer("about_title")}</h3>
          <p className="text-gray-300 leading-relaxed mb-6 text-sm md:text-base">{tx.footer("about_desc")}</p>
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-bold text-accent mb-4">{tx.footer("quick_links")}</h3>
          <ul className="space-y-3">
            {links.map(l => (
              <li key={l.href}><Link href={l.href} className="text-gray-300 hover:text-accent transition-colors duration-200 text-sm md:text-base">{l.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg md:text-xl font-bold text-accent mb-4">{tx.footer("contact_info")}</h3>
          <ul className="space-y-3">
            <li className="flex items-center gap-3 text-gray-300 text-sm md:text-base">
              <MapPin className="text-accent shrink-0" size={18} />
              <span>{tx.footer("address")}</span>
            </li>
            <li className="flex items-center gap-3 text-gray-300 text-sm md:text-base">
              <Phone className="text-accent shrink-0" size={18} />
              <span dir="ltr">05XX XX XX XX</span>
            </li>
          </ul>
        </div>
      </div>
      <div className="container mx-auto px-4 border-t border-white/10 pt-6 text-center text-gray-500 text-xs md:text-sm">
        <p>{tx.footer("rights")} &copy; {new Date().getFullYear()} {tx.footer("about_title")}.</p>
      </div>
    </footer>
  );

  if (loading) return skeleton;

  return (
    <footer className="bg-primary text-white pt-12 pb-8 border-t-4 border-accent">
      <div className="container mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 mb-10">
        {/* About */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
          <h3 className="text-xl md:text-2xl font-bold text-accent mb-4">{tx.footer("about_title")}</h3>
          <p className="text-gray-300 leading-relaxed mb-6 text-sm md:text-base">{tx.footer("about_desc")}</p>
          {socials.length > 0 && (
            <div className="flex gap-4 flex-wrap">
              {socials.map(s => (
                <a key={s.network} href={s.href} target="_blank" rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-accent hover:text-primary transition-all duration-300"
                  aria-label={s.label}>
                  <SocialIcon network={s.network} />
                </a>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick Links */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}>
          <h3 className="text-lg md:text-xl font-bold text-accent mb-4">{tx.footer("quick_links")}</h3>
          <ul className="space-y-3">
            {links.map(l => (
              <li key={l.href}><Link href={l.href} className="text-gray-300 hover:text-accent transition-colors duration-200 text-sm md:text-base">{l.label}</Link></li>
            ))}
          </ul>
        </motion.div>

        {/* Contact */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.2 }}>
          <h3 className="text-lg md:text-xl font-bold text-accent mb-4">{tx.footer("contact_info")}</h3>
          <ul className="space-y-3">
            {addresses.length > 0 ? (
              addresses.map((a, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300 text-sm md:text-base">
                  <MapPin className="text-accent shrink-0" size={18} />
                  {a.url ? (
                    <a href={a.url} target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors duration-200 underline decoration-accent/40 underline-offset-4">{a.text}</a>
                  ) : (
                    <span>{a.text}</span>
                  )}
                </li>
              ))
            ) : (
              <li className="flex items-center gap-3 text-gray-300 text-sm md:text-base">
                <MapPin className="text-accent shrink-0" size={18} />
                <span>{tx.footer("address")}</span>
              </li>
            )}
            {phones.map(p => (
              <li key={p} className="flex items-center gap-3 text-gray-300 text-sm md:text-base">
                <Phone className="text-accent shrink-0" size={18} />
                <a href={`tel:${p.replace(/[^\d+]/g, "")}`} dir="ltr" className="hover:text-accent transition-colors duration-200 underline decoration-accent/40 underline-offset-4">{p}</a>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 border-t border-white/10 pt-6 text-center text-gray-500 text-xs md:text-sm">
        <p>{tx.footer("rights")} &copy; {new Date().getFullYear()} {tx.footer("about_title")}.</p>
      </div>
    </footer>
  );
}
