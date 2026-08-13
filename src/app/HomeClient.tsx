"use client";

import { useEffect, useState } from "react";
import { Product } from "@/lib/types";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { ParallaxHero } from "@/components/home/ParallaxHero";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { NewArrivalsSection } from "@/components/home/NewArrivalsSection";
import { CTABanner } from "@/components/home/CTABanner";

export default function Home({
  initialHero,
  initialCatImages,
  initialActive = [],
}: {
  initialHero: string;
  initialCatImages: Record<string, string>;
  initialActive?: string[];
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [media, setMedia] = useState<{ hero: string; catImages: Record<string, string>; active: string[] }>({
    hero: initialHero,
    catImages: initialCatImages,
    active: initialActive,
  });
  const { lang } = useLang();
  const tx = t(lang);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const res = await fetch("/api/products");
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : (data.products ?? []);
          setProducts(list);
        }
      } catch (e) {
        console.error("Failed to fetch products:", e);
      }
    }
    fetchProducts();

    fetch("/api/gallery-config")
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (!data) return;
        const catImages: Record<string, string> = {};
        const active: string[] = [];
        (data.categories || []).forEach((c: { slug: string; image: string; is_active?: boolean }) => {
          catImages[c.slug] = c.image;
          if (c.is_active) active.push(c.slug);
        });
        setMedia({ hero: data.heroImage || "/images/hero_caftan.webp", catImages, active });
      })
      .catch(() => {});
  }, []);

  const categories = [
    { id: 1, slug: "caftans",          title: tx.cat("caftan"),  sub: tx.cat("caftan_sub"),  image: media.catImages["caftans"]          ?? "/images/category_bridal.webp",  href: "/shop?cat=caftan"  },
    { id: 2, slug: "robes-kabyles",    title: tx.cat("kabyle"),  sub: tx.cat("kabyle_sub"),  image: media.catImages["robes-kabyles"]    ?? "/images/category_modern.webp",  href: "/shop?cat=kabyle"  },
    { id: 3, slug: "blouza-oranaise",  title: tx.cat("blouza"),  sub: tx.cat("blouza_sub"),  image: media.catImages["blouza-oranaise"]  ?? "/images/category_tasdira.webp", href: "/shop?cat=blouza"  },
    { id: 4, slug: "karakou",          title: tx.cat("karakou"), sub: tx.cat("karakou_sub"), image: media.catImages["karakou"]          ?? "/images/category_bridal.webp",  href: "/shop?cat=karakou" },
    { id: 5, slug: "robes-d-hotesse",  title: tx.cat("hotesse"), sub: tx.cat("hotesse_sub"), image: media.catImages["robes-d-hotesse"]  ?? "/images/category_modern.webp",  href: "/shop?cat=hotesse" },
  ].filter(c => media.active.includes(c.slug));

  return (
    <div className="flex flex-col min-h-screen">
      <ParallaxHero heroImage={media.hero} />

      <div className="w-full relative -mt-1 bg-background">
        <svg className="w-full h-24 sm:h-32" viewBox="0 0 1440 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0,60 C240,20 480,20 720,60 C960,100 1200,100 1440,60 L1440,0 L0,0 Z"
            fill="#000000"
            opacity="1"
          />
        </svg>
      </div>

      <CategoriesSection categories={categories} />
      <NewArrivalsSection products={products} />
      <CTABanner />
    </div>
  );
}
