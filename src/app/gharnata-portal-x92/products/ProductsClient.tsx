"use client";
import { useState } from "react";
import { CATEGORIES, ProductCategory } from "@/lib/types";
import {
  Plus, Search, Package, Pencil, Trash2, CheckCircle, XCircle,
  Upload, Video, Star, Image as ImageIcon, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import RefreshButton from "@/components/admin/RefreshButton";
import { useLang } from "@/hooks/useLang";
import { t } from "@/lib/i18n";
import { csrfHeaders } from "@/lib/client-csrf";
import { parseVideoEmbedUrl } from "@/lib/video-embed";
import imageCompression from "browser-image-compression";

export interface D1ProductItem {
  id: number | string;
  title: string;
  name?: string;
  title_fr?: string;
  title_en?: string;
  category_id?: number;
  category_slug?: string;
  category?: ProductCategory;
  price: number;
  description: string;
  description_fr?: string;
  description_en?: string;
  sizes: string[];
  colors: Array<{ id: string; name: string; value: string }>;
  color_media_map?: Record<string, string[]>;
  images: string[];
  videos: string[];
  primary_image: string | null;
  is_active?: boolean;
  stock?: "available" | "out_of_stock";
  is_featured?: boolean;
  featured?: boolean;
}

const CATEGORY_MAP: Record<string, number> = {
  caftan: 1,
  kabyle: 2,
  blouza: 3,
  karakou: 4,
  hotesse: 5,
};

const SIZES = ["S", "M", "L", "XL", "XXL", "38", "40", "42", "44", "Sur Mesure"];

interface RawProduct {
  id?: number | string;
  title?: string;
  name?: string;
  title_fr?: string;
  title_en?: string;
  category_id?: number;
  category_slug?: string;
  category?: ProductCategory;
  price?: number;
  description?: string;
  description_fr?: string;
  description_en?: string;
  sizes?: string[];
  colors?: Array<{ id: string; name: string; value: string }>;
  color_media_map?: Record<string, string[]>;
  images?: string[];
  videos?: string[];
  primary_image?: string | null;
  is_active?: boolean;
  stock?: string;
  is_featured?: boolean;
  featured?: boolean;
}
const DEFAULT_COLORS = [
  { id: "gold", name: "ذهبي", value: "#D4AF37" },
  { id: "white", name: "أبيض", value: "#FFFFFF" },
  { id: "black", name: "أسود", value: "#111111" },
  { id: "red", name: "أحمر", value: "#C0392B" },
  { id: "blue", name: "أزرق", value: "#2980B9" },
  { id: "green", name: "أخضر", value: "#27AE60" },
  { id: "pink", name: "وردي", value: "#E84393" },
  { id: "purple", name: "بنفسجي", value: "#8E44AD" },
  { id: "burgundy", name: "عنابي", value: "#6B1D2F" },
  { id: "emerald", name: "زمردي / زيتي", value: "#16A085" },
  { id: "beige", name: "بيج", value: "#F5F5DC" },
  { id: "silver", name: "فضي", value: "#C0C0C0" },
];

const R2_BASE = "https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev";

function fixMediaUrl(url: string): string {
  if (!url) return "";
  let clean = url.trim();
  if (clean.startsWith("blob:")) return clean;
  if (clean.startsWith("/api/media/")) return clean;

  // Extract key if it's an R2 URL (r2.dev or cloudflarestorage.com)
  if (clean.includes("pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev/")) {
    clean = clean.split("pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev/")[1];
  } else if (clean.includes(".r2.dev/")) {
    const idx = clean.indexOf(".r2.dev/");
    clean = clean.slice(idx + 8);
  } else if (clean.includes("cloudflarestorage.com/")) {
    const parts = clean.split("/");
    const uploadsIdx = parts.indexOf("uploads");
    if (uploadsIdx !== -1) {
      clean = parts.slice(uploadsIdx).join("/");
    }
  }

  // External social links (Instagram, TikTok, YouTube) stay direct
  if (
    clean.includes("instagram.com") ||
    clean.includes("tiktok.com") ||
    clean.includes("youtube.com") ||
    clean.includes("youtu.be")
  ) {
    return clean;
  }

  // If it's an external HTTP URL not matching our R2 bucket, keep as is
  if ((clean.startsWith("http://") || clean.startsWith("https://")) && !clean.includes("r2.dev") && !clean.includes("cloudflarestorage.com")) {
    return clean;
  }

  // Route everything else through /api/media/ (Vercel proxy = works on Djezzy 100%)
  return `/api/media/${clean.replace(/^\/+/, "")}`;
}

function uniqMedia(urls: string[]): string[] {
  const seen = new Set<string>();
  return urls
    .map(fixMediaUrl)
    .filter(Boolean)
    .filter(url => {
      const key = url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeColorMediaMap(
  rawMap: Record<string, string[]> | undefined,
  colors: Array<{ id: string; name: string; value: string }>,
  mediaUrls: string[]
): Record<string, string[]> {
  const normalizedMedia = new Map<string, string>();
  for (const url of mediaUrls) {
    const fixed = fixMediaUrl(url);
    if (fixed) normalizedMedia.set(fixed.toLowerCase(), fixed);
  }

  const colorByKey = new Map<string, string>();
  for (const color of colors) {
    colorByKey.set(String(color.id).toLowerCase(), color.id);
    colorByKey.set(String(color.name).toLowerCase(), color.id);
    colorByKey.set(String(color.value).toLowerCase(), color.id);
  }

  const next: Record<string, string[]> = {};
  const usedMedia = new Set<string>();

  for (const [rawColorId, rawList] of Object.entries(rawMap || {})) {
    const colorId = colorByKey.get(String(rawColorId).toLowerCase());
    if (!colorId || next[colorId] || !Array.isArray(rawList)) continue;

    for (const rawUrl of rawList) {
      const fixed = fixMediaUrl(String(rawUrl || ""));
      const canonical = normalizedMedia.get(fixed.toLowerCase());
      if (canonical && !usedMedia.has(canonical.toLowerCase())) {
        next[colorId] = [canonical];
        usedMedia.add(canonical.toLowerCase());
        break;
      }
    }
  }

  return next;
}

function getLinkedColorId(colorMediaMap: Record<string, string[]> | undefined, mediaUrl: string): string {
  const target = fixMediaUrl(mediaUrl).toLowerCase();
  for (const [colorId, list] of Object.entries(colorMediaMap || {})) {
    if (Array.isArray(list) && list.some(url => fixMediaUrl(String(url)).toLowerCase() === target)) {
      return colorId;
    }
  }
  return "";
}

function removeMediaFromColorMap(colorMediaMap: Record<string, string[]> | undefined, mediaUrl: string): Record<string, string[]> {
  const target = fixMediaUrl(mediaUrl).toLowerCase();
  const next: Record<string, string[]> = {};
  for (const [colorId, list] of Object.entries(colorMediaMap || {})) {
    const remaining = Array.isArray(list)
      ? list.map(String).filter(url => fixMediaUrl(url).toLowerCase() !== target)
      : [];
    if (remaining.length > 0) next[colorId] = remaining;
  }
  return next;
}

function normalizeDashboardProduct(p: RawProduct): D1ProductItem {
  const colors = Array.isArray(p.colors) ? p.colors : [];
  const images = uniqMedia(Array.isArray(p.images) ? p.images : []);
  const videos = uniqMedia(Array.isArray(p.videos) ? p.videos : []);
  const primary = p.primary_image ? fixMediaUrl(String(p.primary_image)) : (images[0] || null);
  const media = uniqMedia([primary || "", ...images, ...videos]);

  return {
    id: p.id ?? 0,
    title: p.title || p.name || "",
    name: p.title || p.name || "",
    title_fr: p.title_fr || "",
    title_en: p.title_en || "",
    category: (p.category_slug as ProductCategory) || p.category || "caftan",
    category_id: p.category_id || CATEGORY_MAP[p.category_slug || p.category || "caftan"] || 1,
    price: p.price || 0,
    description: p.description || "",
    description_fr: p.description_fr || "",
    description_en: p.description_en || "",
    sizes: Array.isArray(p.sizes) ? p.sizes : [],
    colors,
    color_media_map: normalizeColorMediaMap(p.color_media_map || {}, colors, media),
    images,
    videos,
    primary_image: primary,
    is_active: p.is_active ?? (p.stock !== "out_of_stock"),
    stock: (p.is_active ?? (p.stock !== "out_of_stock")) ? "available" : "out_of_stock",
    is_featured: Boolean(p.is_featured ?? p.featured),
    featured: Boolean(p.is_featured ?? p.featured),
  };
}
/**
 * Native Browser Image Compression
 * Compress high-res images to ~250KB WebP before uploading to Cloudflare R2.
 * Makes uploads 15x faster on Algerian mobile/DSL connections!
 */
async function compressImageIfNeeded(file: File): Promise<File> {
  const isImg = file.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|avif|heic|heif)$/i.test(file.name);
  if (!isImg || file.size < 300 * 1024) {
    return file; // Skip videos or small images
  }

  return new Promise((resolve) => {
    // 3.5s Timeout Safety: Never block mobile uploads if Canvas compression hangs on HEIC/mobile photo formats!
    const timer = setTimeout(() => resolve(file), 3500);

    try {
      // For HEIC/HEIF files, skip canvas compression and upload directly
      // The server-side /api/admin/uploads handler will optimize them
      const heicExtensions = [".heic", ".heif"];
      const hasHeicExt = heicExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (hasHeicExt) {
        // HEIC/HEIF - skip canvas, upload original, let server optimize
        resolve(file);
        return;
      }

      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        clearTimeout(timer);
        URL.revokeObjectURL(url);
        try {
          const canvas = document.createElement("canvas");
          const MAX_DIM = 1800; // Crisp quality for fashion products
          let width = img.width;
          let height = img.height;

          if (!width || !height) { resolve(file); return; }

          if (width > height) {
            if (width > MAX_DIM) {
              height = Math.round((height * MAX_DIM) / width);
              width = MAX_DIM;
            }
          } else {
            if (height > MAX_DIM) {
              width = Math.round((width * MAX_DIM) / height);
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (!ctx) { resolve(file); return; }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) { resolve(file); return; }
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".webp", {
                type: "image/webp",
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            "image/webp",
            0.85
          );
        } catch {
          resolve(file);
        }
      };
      img.onerror = () => {
        // Image API couldn't load (e.g., HEIC/HEIF not supported by browser)
        // Fall back to original file, server will optimize
        clearTimeout(timer);
        try { URL.revokeObjectURL(url); } catch {}
        resolve(file);
      };
      img.src = url;
    } catch {
      clearTimeout(timer);
      resolve(file);
    }
  });
}

export default function ProductsClient({ initialProducts }: { initialProducts: RawProduct[] }) {
  const { lang, dir } = useLang();
  const tx = t(lang);

  // Normalize initial products from D1
  const normalizedInitial: D1ProductItem[] = initialProducts.map(normalizeDashboardProduct);

  const [products, setProducts] = useState<D1ProductItem[]>(normalizedInitial);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<ProductCategory | "all">("all");
  const [showForm, setShowForm] = useState(false);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // States for custom size and custom color picker
  const [availableSizes, setAvailableSizes] = useState<string[]>(SIZES);
  const [availableColors, setAvailableColors] = useState<Array<{ id: string; name: string; value: string }>>(DEFAULT_COLORS);
  const [customSizeInput, setCustomSizeInput] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#D4AF37");
  const [customColorName, setCustomColorName] = useState("");

  const [form, setForm] = useState<{
    id: string | number;
    title_ar: string;
    description_ar: string;
    title_fr: string;
    description_fr: string;
    title_en: string;
    description_en: string;
    category: ProductCategory;
    price: number;
    sizes: string[];
    colors: Array<{ id: string; name: string; value: string }>;
    color_media_map: Record<string, string[]>;
    primary_image: string | null;
    images: string[];
    videos: string[];
    stock: "available" | "out_of_stock";
    featured: boolean;
  }>({
    id: "",
    title_ar: "",
    description_ar: "",
    title_fr: "",
    description_fr: "",
    title_en: "",
    description_en: "",
    category: "caftan",
    price: 0,
    sizes: [],
    colors: [],
    color_media_map: {},
    primary_image: "",
    images: [],
    videos: [],
    stock: "available",
    featured: false,
  });

  const [saving, setSaving] = useState(false);
  const [uploadingPrimary, setUploadingPrimary] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadStatusTextPrimary, setUploadStatusTextPrimary] = useState("");
  const [uploadStatusTextGallery, setUploadStatusTextGallery] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [videoLinkInput, setVideoLinkInput] = useState("");

  const handleAddVideoLink = (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    const raw = videoLinkInput || "";
    // Clean mobile URL: strip newlines, whitespace, zero-width space characters from mobile clipboard
    const url = raw.trim().replace(/[\r\n\t\u200B-\u200D\uFEFF]/g, "");
    if (!url) return;
    setForm(f => ({
      ...f,
      videos: [...(f.videos || []), url],
    }));
    setVideoLinkInput("");
  };

  const filtered = products.filter(p => {
    const title = p.title || p.name || "";
    const matchSearch = !search || title.toLowerCase().includes(search.toLowerCase());
    const matchCat = catFilter === "all" || p.category === catFilter;
    return matchSearch && matchCat;
  });

  function openNew() {
    setCurrentStep(1);
    setCustomSizeInput("");
    setCustomColorName("");
    setCustomColorHex("#D4AF37");
    setForm({
      id: "",
      title_ar: "",
      description_ar: "",
      title_fr: "",
      description_fr: "",
      title_en: "",
      description_en: "",
      category: "caftan",
      price: 0,
      sizes: [],
      colors: [],
      color_media_map: {},
      primary_image: "",
      images: [],
      videos: [],
      stock: "available",
      featured: false,
    });
    setShowForm(true);
  }

  function openEdit(product: D1ProductItem) {
    const p = normalizeDashboardProduct(product);
    const primary = p.primary_image || (p.images && p.images[0]) || "";
    const galleryImages = p.images ? p.images.filter(img => img !== primary) : [];

    setCurrentStep(1);
    setCustomSizeInput("");
    setCustomColorName("");
    setCustomColorHex("#D4AF37");

    if (p.sizes && Array.isArray(p.sizes)) {
      setAvailableSizes(prev => Array.from(new Set([...prev, ...p.sizes])));
    }
    if (p.colors && Array.isArray(p.colors)) {
      setAvailableColors(prev => {
        const list = [...prev];
        for (const c of p.colors) {
          if (!list.some(lc => lc.id === c.id || lc.value.toLowerCase() === c.value.toLowerCase())) {
            list.push(c);
          }
        }
        return list;
      });
    }

    setForm({
      id: p.id,
      title_ar: p.title || p.name || "",
      description_ar: p.description || "",
      title_fr: p.title_fr || "",
      description_fr: p.description_fr || "",
      title_en: p.title_en || "",
      description_en: p.description_en || "",
      category: (p.category as ProductCategory) || "caftan",
      price: p.price,
      sizes: p.sizes || [],
      colors: p.colors || [],
      color_media_map: normalizeColorMediaMap(p.color_media_map, p.colors || [], [primary, ...galleryImages, ...(p.videos || [])]),
      primary_image: primary,
      images: galleryImages,
      videos: uniqMedia(p.videos || []),
      stock: p.is_active ?? (p.stock !== "out_of_stock") ? "available" : "out_of_stock",
      featured: Boolean(p.is_featured ?? p.featured),
    });
    setShowForm(true);
  }


function getVideoProxyUrl(url: string): string {
  if (!url) return "";
  const direct = fixMediaUrl(url);
  if (!direct) return "";
  return direct.includes("#t=") ? direct : `${direct}#t=0.1`;
}

  // ═════════════════════════════════════════════════════════════════════════════════
  // CLOUDFLARE WORKER UPLOAD SYSTEM — Bypasses Vercel 4.5MB limit
  // ════════════════════════════════════════════════════════════════════════════════

  interface ProxyUploadResult {
    url: string;
    key: string;
    kind: string;
    size: number;
  }

  async function uploadFileViaProxy(
    file: File,
    sessionHdrs: Record<string, string>,
    onProgress?: (pct: number, loadedMb: number, totalMb: number) => void
  ): Promise<ProxyUploadResult> {
    
    // We first ask our Vercel API for a temporary upload token/secret
    const authRes = await fetch("/api/admin/upload-auth", {
      headers: sessionHdrs
    });
    const authData = await authRes.json();
    if (!authData.secret) throw new Error("Could not get upload authorization");

    // Client-side optimization for images to save bandwidth & convert HEIC
    let finalFile = file;
    const isImage = file.type.startsWith("image/") || /\.(heic|heif|png|jpg|jpeg)$/i.test(file.name);
    
    if (isImage) {
      if (onProgress) onProgress(0, 0, 0); // show initial progress
      try {
        finalFile = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          fileType: "image/webp"
        });
      } catch (err) {
        console.warn("Client compression failed, using original", err);
      }
    }

    return new Promise((resolve, reject) => {
      const ext = finalFile.name.split('.').pop() || "bin";
      const key = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      const xhr = new XMLHttpRequest();
      // Directly hit the Cloudflare Worker attached to our domain
      xhr.open("POST", `https://www.caftan-gharnata.com/api/r2-upload/upload?key=${encodeURIComponent(key)}`, true);

      xhr.setRequestHeader("X-Admin-Secret", authData.secret);
      xhr.setRequestHeader("Content-Type", finalFile.type || "application/octet-stream");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct, e.loaded / 1024 / 1024, e.total / 1024 / 1024);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.ok) {
              resolve({
                url: `/media/${key}`,
                key: key,
                kind: isImage ? "image" : "video",
                size: finalFile.size
              });
            } else {
              reject(new Error(data.error || "Upload response invalid"));
            }
          } catch {
            reject(new Error("Invalid JSON from upload worker"));
          }
        } else {
          reject(new Error(`Upload failed: HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.ontimeout = () => reject(new Error("Upload timeout"));
      xhr.send(finalFile); // Send raw file, not FormData
    });
  }

  // ─── PRIMARY IMAGE UPLOAD ─────────────────────────────────────────────────
  async function handlePrimaryUpload(files: FileList | null) {
    if (!files || !files[0]) return;
    const rawFile = files[0];
    setUploadingPrimary(true);

    // Show LOCAL blob preview immediately for renderable formats (skip HEIC)
    const isHeic = /\.(heic|heif)$/i.test(rawFile.name) || /image\/(heic|heif)/i.test(rawFile.type || "");
    let localPreview: string | null = null;
    if (!isHeic) {
      localPreview = URL.createObjectURL(rawFile);
      setForm(f => ({ ...f, primary_image: localPreview }));
    } else {
      setUploadStatusTextPrimary(`📷 ${rawFile.name} — envoi en cours…`);
    }

    try {
      const hdrs = await csrfHeaders();
      setUploadStatusTextPrimary(`⚡ Envoi vers le serveur…`);

      // Single-step: POST to our own server (never touches r2.cloudflarestorage.com)
      const result = await uploadFileViaProxy(rawFile, hdrs, (pct, loadedMb, totalMb) => {
        setUploadStatusTextPrimary(
          `⬆️ Upload (${pct}%) — ${loadedMb.toFixed(1)} / ${totalMb.toFixed(1)} MB`
        );
      });

      // Use /media/ proxy for display (works on Djezzy/mobile)
      const proxyUrl = result.url;
      setForm(f => ({ ...f, primary_image: proxyUrl }));
      if (localPreview) URL.revokeObjectURL(localPreview);
      setUploadStatusTextPrimary("✅ Photo uploadée et optimisée!");
      console.log("[primary upload] ✅", proxyUrl);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[primary upload] ❌", e);
      setUploadStatusTextPrimary(`❌ ${msg}`);
    } finally {
      setUploadingPrimary(false);
      setTimeout(() => setUploadStatusTextPrimary(""), 5000);
    }
  }

  // ─── GALLERY UPLOAD (images + videos) ────────────────────────────────────

  async function handleGalleryUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    setUploadingGallery(true);
    let successCount = 0;
    const errors: string[] = [];

    // Collect ALL results first, then flush to state once at the end
    const newImages: string[] = [];
    const newVideos: string[] = [];

    try {
      const hdrs = await csrfHeaders();

      // Upload each file sequentially via our own server proxy
      // Browser NEVER contacts r2.cloudflarestorage.com
      for (let i = 0; i < fileList.length; i++) {
        const rawFile = fileList[i];
        const isVideo = rawFile.type.startsWith("video/") || /\.(mp4|mov|webm|mkv|avi|3gp|m4v|wmv|mpeg)$/i.test(rawFile.name);
        const kind = isVideo ? "Vidéo" : "Image";

        try {
          setUploadStatusTextGallery(`⚡ Envoi ${kind} ${i + 1}/${fileList.length}…`);

          const result = await uploadFileViaProxy(rawFile, hdrs, (pct, loadedMb, totalMb) => {
            setUploadStatusTextGallery(
              `⬆️ ${kind} ${i + 1}/${fileList.length} (${pct}%) — ${loadedMb.toFixed(1)} / ${totalMb.toFixed(1)} MB`
            );
          });

          const proxyUrl = result.url;
          if (result.kind === "video" || isVideo) {
            newVideos.push(proxyUrl);
          } else {
            newImages.push(proxyUrl);
          }

          successCount++;
          setUploadStatusTextGallery(`✅ ${kind} ${i + 1}/${fileList.length} envoyé`);
          console.log(`[gallery] ✅ ${kind} ${i + 1}:`, proxyUrl);
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e);
          console.error(`[gallery] ❌ ${kind} ${i + 1}:`, e);
          errors.push(`${kind} ${i + 1}: ${msg}`);
          setUploadStatusTextGallery(`❌ ${kind} ${i + 1}: ${msg}`);
        }

        // Breathing room for mobile RAM between files
        if (i < fileList.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      // Single atomic state flush — all files saved together
      if (newImages.length > 0 || newVideos.length > 0) {
        setForm(f => ({
          ...f,
          images: [...f.images, ...newImages],
          videos: [...(f.videos || []), ...newVideos],
        }));
      }

      if (successCount === 0 && errors.length > 0) {
        setUploadStatusTextGallery(`⚠️ ${errors.length} erreur(s): ${errors.join("; ")}`);
      }
    } finally {
      setUploadingGallery(false);
      if (successCount > 0 && errors.length === 0) {
        setUploadStatusTextGallery(`✅ ${successCount} fichier(s) uploadé(s) et optimisés`);
        setTimeout(() => setUploadStatusTextGallery(""), 4000);
      } else if (successCount > 0 && errors.length > 0) {
        setUploadStatusTextGallery(`⚠️ ${successCount} OK — ${errors.length} erreur(s): ${errors[0]}`);
      }
    }
  }

  async function handleSave() {
    const title = form.title_ar.trim() || form.title_fr.trim() || form.title_en.trim();

    if (!title) {
      alert(tx.admin("product_name_required"));
      setCurrentStep(1);
      return;
    }
    if (!form.price || form.price <= 0) {
      alert(`${tx.admin("price_required")} (${tx.admin("step")} 4)`);
      setCurrentStep(4);
      return;
    }
    if (!form.primary_image && form.images.length === 0) {
      alert(`${tx.admin("primary_image_required")} (${tx.admin("step")} 4)`);
      setCurrentStep(4);
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(form.id);

      const cleanColorMediaMap = normalizeColorMediaMap(form.color_media_map, form.colors, [form.primary_image ?? "", ...form.images, ...form.videos]);

      const payload = {
        id: form.id,
        title,
        title_ar: form.title_ar.trim(),
        title_fr: form.title_fr.trim(),
        title_en: form.title_en.trim(),
        price: form.price,
        category_id: CATEGORY_MAP[form.category] || 1,
        description: form.description_ar.trim() || form.description_fr.trim() || form.description_en.trim() || "",
        description_ar: form.description_ar.trim(),
        description_fr: form.description_fr.trim(),
        description_en: form.description_en.trim(),
        sizes: form.sizes,
        colors: form.colors,
        color_media_map: cleanColorMediaMap,
        primary_image: form.primary_image || form.images[0] || "",
        images: uniqMedia(form.images),
        videos: uniqMedia(form.videos),
        is_active: form.stock === "available",
        is_featured: form.featured,
      };

const res = await fetch("/api/admin/products", {
        method: isEdit ? "PUT" : "POST",
        headers: await csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.ok) {
        // Refresh product list from D1
        const listRes = await fetch("/api/admin/products");
        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData.products) {
            setProducts(listData.products.map(normalizeDashboardProduct));
          }
        }
        setShowForm(false);
      } else {
        alert(data.error || tx.admin("save_failed"));
      }
    } catch {
      alert(tx.admin("save_server_error"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string | number) {
    if (!confirm(tx.admin("delete_confirm_product"))) return;
    const numId = Number(id);
    // 1. Instant UI response on 1st click
    setProducts(prev => prev.filter(p => Number(p.id) !== numId));

    try {
      const res = await fetch(`/api/admin/products?id=${numId}`, {
        method: "DELETE",
        headers: await csrfHeaders(),
      });
      if (res.ok) {
        // Re-fetch to guarantee complete D1 alignment
        const listRes = await fetch("/api/admin/products");
        if (listRes.ok) {
          const listData = await listRes.json();
          if (listData.products) {
            setProducts(listData.products.map(normalizeDashboardProduct));
          }
        }
      } else {
        alert(tx.admin("delete_failed"));
      }
    } catch {
      alert(tx.admin("delete_server_error"));
    }
  }

  function toggleSize(size: string) {
    setForm(f => ({
      ...f,
      sizes: f.sizes.includes(size) ? f.sizes.filter(s => s !== size) : [...f.sizes, size]
    }));
  }

  function addCustomSize() {
    const val = customSizeInput.trim();
    if (!val) return;
    if (!availableSizes.includes(val)) {
      setAvailableSizes(prev => [...prev, val]);
    }
    if (!form.sizes.includes(val)) {
      setForm(f => ({ ...f, sizes: [...f.sizes, val] }));
    }
    setCustomSizeInput("");
  }

  function removeSizeOption(sizeToRemove: string, e: React.MouseEvent) {
    e.stopPropagation();
    setAvailableSizes(prev => prev.filter(s => s !== sizeToRemove));
    setForm(f => ({ ...f, sizes: f.sizes.filter(s => s !== sizeToRemove) }));
  }

  function toggleColor(color: { id: string; name: string; value: string }) {
    setForm(f => {
      const isSelected = f.colors.some(c => c.id === color.id || c.value.toLowerCase() === color.value.toLowerCase());
      if (isSelected) {
        return { ...f, colors: f.colors.filter(c => c.id !== color.id && c.value.toLowerCase() !== color.value.toLowerCase()) };
      } else {
        return { ...f, colors: [...f.colors, color] };
      }
    });
  }

  function addCustomColor() {
    const name = customColorName.trim() || customColorHex;
    const newColor = { id: `custom-${Date.now()}`, name, value: customColorHex };
    setAvailableColors(prev => {
      if (prev.some(c => c.value.toLowerCase() === customColorHex.toLowerCase())) return prev;
      return [...prev, newColor];
    });
    setForm(f => {
      const exists = f.colors.some(c => c.value.toLowerCase() === customColorHex.toLowerCase());
      if (exists) return f;
      return { ...f, colors: [...f.colors, newColor] };
    });
    setCustomColorName("");
  }

  function removeColorOption(colorId: string, colorValue: string, e: React.MouseEvent) {
    e.stopPropagation();
    setAvailableColors(prev => prev.filter(c => c.id !== colorId && c.value.toLowerCase() !== colorValue.toLowerCase()));
    setForm(f => ({
      ...f,
      colors: f.colors.filter(c => c.id !== colorId && c.value.toLowerCase() !== colorValue.toLowerCase())
    }));
  }

  function addUrlManual() {
    if (!urlInput.trim()) return;
    const url = urlInput.trim();
    if (url.match(/\.(mp4|webm|mov)$/i)) {
      setForm(f => ({ ...f, videos: [...f.videos, url] }));
    } else {
      if (!form.primary_image) {
        setForm(f => ({ ...f, primary_image: url }));
      } else {
        setForm(f => ({ ...f, images: [...f.images, url] }));
      }
    }
    setUrlInput("");
  }

  return (
    <div className="p-6 lg:p-10" dir={dir}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">{tx.admin("products_title")}</h1>
          <p className="text-gray-500 mt-1">{products.length} {tx.admin("products_count_suffix")} (Cloudflare D1 + R2 Storage)</p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton
            onRefresh={async () => {
              const res = await fetch("/api/admin/products");
              if (res.ok) {
                const data = await res.json();
                if (data.products) {
                  setProducts(data.products.map((p: RawProduct) => ({
                    id: p.id,
                    title: p.title || p.name,
                    category: p.category_slug || p.category || "caftan",
                    price: p.price,
                    description: p.description,
                    sizes: p.sizes || [],
                    colors: p.colors || [],
                    primary_image: p.primary_image || (p.images && p.images[0]) || null,
                    images: p.images || [],
                    videos: p.videos || [],
                    is_active: p.is_active,
                    stock: p.is_active ? "available" : "out_of_stock",
                    is_featured: p.is_featured,
                  })));
                }
              }
            }}
          />
          <button
            onClick={openNew}
            className="flex items-center gap-2 bg-[#D4AF37] text-black px-5 py-3 rounded-xl font-bold text-sm hover:bg-[#c29c2d] shadow-lg shadow-[#D4AF37]/10 transition-all"
          >
            <Plus className="w-5 h-5" />
            {tx.admin("add_product")}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={tx.admin("search_products")}
            className="w-full bg-[#111118] border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
          />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value as ProductCategory | "all")}
          className="bg-[#111118] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30"
        >
          <option value="all">{tx.admin("all_categories")}</option>
          {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.ar} — {v.fr}</option>)}
        </select>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-600 bg-[#111118] border border-white/5 rounded-3xl">
          <Package className="w-16 h-16 mx-auto mb-4 opacity-30 text-[#D4AF37]" />
          <p className="text-lg font-semibold text-gray-400">{tx.admin("no_products")}</p>
          <p className="text-sm text-gray-600 mt-1">{tx.admin("no_products_hint")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map(p => {
            const categoryConfig = CATEGORIES[p.category as ProductCategory] || CATEGORIES.caftan;
            const displayImage = (p.primary_image && p.primary_image.trim() !== "") ? p.primary_image : (p.images && p.images[0]) || "";
            const isAvailable = p.is_active ?? (p.stock === "available");
            return (
              <div key={p.id} className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden hover:border-[#D4AF37]/30 transition-all group flex flex-col justify-between">
                <div>
                  <div className="h-56 bg-[#1a1a24] flex items-center justify-center text-4xl relative overflow-hidden">
                    {displayImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={displayImage} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <Package className="w-12 h-12 text-gray-700" />
                    )}

                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold shadow-md ${isAvailable ? "bg-[#D4AF37]/90 text-black" : "bg-red-500/90 text-white"}`}>
                        {isAvailable ? tx.admin("available") : tx.admin("unavailable")}
                      </span>
                      {p.primary_image && (
                        <span className="bg-[#D4AF37]/90 text-black text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-md">
                          <Star className="w-3 h-3 fill-black" /> {tx.admin("main_image_badge")}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-4">
                    <p className="text-[#D4AF37] text-xs font-semibold mb-1">{categoryConfig.ar}</p>
                    <p className="text-white font-bold text-base mb-1 truncate">{p.title || p.name}</p>
                    <p className="text-gray-400 text-xs line-clamp-2 mb-3 min-h-[32px]">{p.description || tx.admin("no_description")}</p>
                    <p className="text-white font-extrabold text-lg">
                      {p.price.toLocaleString()} <span className="text-xs text-[#D4AF37] font-semibold">د.ج</span>
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-white/5 mt-3 flex gap-2">
                  <button onClick={() => openEdit(p)} className="flex-1 flex items-center justify-center gap-1.5 bg-white/5 hover:bg-[#D4AF37]/20 hover:text-[#D4AF37] text-white text-xs font-semibold py-2.5 rounded-xl transition-all">
                    <Pencil className="w-3.5 h-3.5" /> {tx.admin("edit")}
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-2.5 text-red-400 hover:bg-red-500/10 rounded-xl transition-all" title={tx.admin("delete")}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Form for Add/Edit Product (4 Steps Wizard) */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
            onClick={e => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#111118] border border-white/10 rounded-3xl p-5 sm:p-8 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl space-y-6"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2">
                    <Package className="w-6 h-6 text-[#D4AF37]" />
                    {form.id ? tx.admin("edit_product") : tx.admin("add_product")}
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">{tx.admin("step")} {currentStep} {tx.admin("of")} 4</p>
                </div>
                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-white transition-colors">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              {/* 4 Steps Navigation Tab Bar */}
              <div className="grid grid-cols-4 gap-1.5 sm:gap-2 border-b border-white/10 pb-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex flex-col items-center py-2 px-1 sm:px-3 rounded-xl border transition-all text-[11px] sm:text-xs font-bold ${
                    currentStep === 1
                      ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-md shadow-[#D4AF37]/20 scale-[1.02]"
                      : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-sm sm:text-base mb-0.5">🇩🇿</span>
                  <span className="truncate w-full text-center">{tx.admin("step_ar")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className={`flex flex-col items-center py-2 px-1 sm:px-3 rounded-xl border transition-all text-[11px] sm:text-xs font-bold ${
                    currentStep === 2
                      ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-md shadow-[#D4AF37]/20 scale-[1.02]"
                      : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-sm sm:text-base mb-0.5">🇫🇷</span>
                  <span className="truncate w-full text-center">{tx.admin("step_fr")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className={`flex flex-col items-center py-2 px-1 sm:px-3 rounded-xl border transition-all text-[11px] sm:text-xs font-bold ${
                    currentStep === 3
                      ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-md shadow-[#D4AF37]/20 scale-[1.02]"
                      : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-sm sm:text-base mb-0.5">🇬🇧</span>
                  <span className="truncate w-full text-center">{tx.admin("step_en")}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className={`flex flex-col items-center py-2 px-1 sm:px-3 rounded-xl border transition-all text-[11px] sm:text-xs font-bold ${
                    currentStep === 4
                      ? "bg-[#D4AF37] text-black border-[#D4AF37] shadow-md shadow-[#D4AF37]/20 scale-[1.02]"
                      : "bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-sm sm:text-base mb-0.5">⚙️</span>
                  <span className="truncate w-full text-center">{tx.admin("step_common")}</span>
                </button>
              </div>

              {/* STEP 1: Arabic Info */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs sm:text-sm bg-[#D4AF37]/10 p-3 rounded-xl border border-[#D4AF37]/20">
                    <span>🇩🇿</span>
                    <span>{tx.admin("banner_ar")}</span>
                  </div>

                  <div>
                    <label className="text-white text-sm font-semibold mb-1.5 block">{tx.admin("product_name_ar")}</label>
                    <input
                      value={form.title_ar}
                      onChange={e => setForm(f => ({ ...f, title_ar: e.target.value }))}
                      className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                      placeholder={tx.admin("name_ar_placeholder")}
                    />
                  </div>

                  <div>
                    <label className="text-white text-sm font-semibold mb-1.5 block">{tx.admin("desc_ar")}</label>
                    <textarea
                      value={form.description_ar}
                      onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))}
                      rows={5}
                      className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 resize-none leading-relaxed"
                      placeholder={tx.admin("desc_ar_placeholder")}
                    />
                  </div>
                </div>
              )}

              {/* STEP 2: French Info */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs sm:text-sm bg-[#D4AF37]/10 p-3 rounded-xl border border-[#D4AF37]/20">
                    <span>🇫🇷</span>
                    <span>{tx.admin("banner_fr")}</span>
                  </div>

                  <div>
                    <label className="text-white text-sm font-semibold mb-1.5 block">{tx.admin("product_name_fr")}</label>
                    <input
                      value={form.title_fr}
                      onChange={e => setForm(f => ({ ...f, title_fr: e.target.value }))}
                      className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                      placeholder={tx.admin("name_fr_placeholder")}
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="text-white text-sm font-semibold mb-1.5 block">{tx.admin("desc_fr")}</label>
                    <textarea
                      value={form.description_fr}
                      onChange={e => setForm(f => ({ ...f, description_fr: e.target.value }))}
                      rows={5}
                      className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 resize-none leading-relaxed"
                      placeholder={tx.admin("desc_fr_placeholder")}
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* STEP 3: English Info */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs sm:text-sm bg-[#D4AF37]/10 p-3 rounded-xl border border-[#D4AF37]/20">
                    <span>🇬🇧</span>
                    <span>{tx.admin("banner_en")}</span>
                  </div>

                  <div>
                    <label className="text-white text-sm font-semibold mb-1.5 block">{tx.admin("product_name_en")}</label>
                    <input
                      value={form.title_en}
                      onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))}
                      className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                      placeholder={tx.admin("name_en_placeholder")}
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="text-white text-sm font-semibold mb-1.5 block">{tx.admin("desc_en")}</label>
                    <textarea
                      value={form.description_en}
                      onChange={e => setForm(f => ({ ...f, description_en: e.target.value }))}
                      rows={5}
                      className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 resize-none leading-relaxed"
                      placeholder={tx.admin("desc_en_placeholder")}
                      dir="ltr"
                    />
                  </div>
                </div>
              )}

              {/* STEP 4: Common Info (Media, Price, Category, Sizes, Colors & Stock) */}
              {currentStep === 4 && (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-[#D4AF37] font-bold text-xs sm:text-sm bg-[#D4AF37]/10 p-3 rounded-xl border border-[#D4AF37]/20">
                    <span>⚙️</span>
                    <span>{tx.admin("banner_common")}</span>
                  </div>

                  {/* Price & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white text-sm font-semibold mb-1.5 block">{tx.admin("price_label")}</label>
                      <input
                        type="number"
                        value={form.price || ""}
                        onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))}
                        className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 font-mono"
                        placeholder="45000" dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-white text-sm font-semibold mb-1.5 block">{tx.admin("category_label")}</label>
                      <select
                        value={form.category}
                        onChange={e => setForm(f => ({ ...f, category: e.target.value as ProductCategory }))}
                        className="w-full bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                      >
                        {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v.ar} — {v.fr}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Sizes */}
                  <div className="space-y-3 bg-[#181824] p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-white text-sm font-bold flex items-center gap-2">
                        <span>📐</span> {tx.admin("sizes_label")}
                      </label>
                      {form.sizes.length > 0 ? (
                        <span className="text-[#D4AF37] text-xs font-bold bg-[#D4AF37]/10 px-2.5 py-1 rounded-full border border-[#D4AF37]/30">
                          {tx.admin("size_selected").replace("{n}", String(form.sizes.length))}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs italic">{tx.admin("no_size_selected")}</span>
                      )}
                    </div>

                    <div className="flex gap-2 flex-wrap items-center">
                      {availableSizes.map(s => {
                        const isSelected = form.sizes.includes(s);
                        return (
                          <div key={s} className="relative group/size">
                            <button
                              type="button"
                              onClick={() => toggleSize(s)}
                              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                isSelected
                                  ? "bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/20 scale-105"
                                  : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span>{s}</span>
                              {isSelected && <span>✓</span>}
                              <span
                                onClick={(e) => removeSizeOption(s, e)}
                                title={tx.admin("delete_size")}
                                className="mr-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-extrabold transition-all cursor-pointer"
                              >
                                ✕
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Custom Size Adder Input */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={customSizeInput}
                        onChange={e => setCustomSizeInput(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomSize())}
                        placeholder={tx.admin("custom_size_placeholder")}
                        className="bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 flex-1"
                      />
                      <button
                        type="button"
                        onClick={addCustomSize}
                        className="bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 hover:bg-[#D4AF37] hover:text-black px-4 py-2 rounded-xl text-xs font-bold transition-all"
                      >
                        {tx.admin("add_size")}
                      </button>
                    </div>
                  </div>

                  {/* Colors */}
                  <div className="space-y-3 bg-[#181824] p-4 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-white text-sm font-bold flex items-center gap-2">
                        <span>🎨</span> {tx.admin("colors_label")}
                      </label>
                      {form.colors.length > 0 ? (
                        <span className="text-[#D4AF37] text-xs font-bold bg-[#D4AF37]/10 px-2.5 py-1 rounded-full border border-[#D4AF37]/30">
                          {tx.admin("color_selected").replace("{n}", String(form.colors.length))}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs italic">{tx.admin("no_color_selected")}</span>
                      )}
                    </div>

                    <div className="flex gap-2.5 flex-wrap items-center">
                      {availableColors.map(c => {
                        const isSelected = form.colors.some(fc => fc.id === c.id || fc.value.toLowerCase() === c.value.toLowerCase());
                        return (
                          <div key={c.id} className="relative group/color">
                            <button
                              type="button"
                              onClick={() => toggleColor(c)}
                              title={c.name}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                                isSelected
                                  ? "border-[#D4AF37] bg-[#D4AF37]/20 text-white shadow-md shadow-[#D4AF37]/10 scale-105"
                                  : "border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                              }`}
                            >
                              <span className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-inner" style={{ backgroundColor: c.value }} />
                              <span>{c.name}</span>
                              {isSelected && <span>✓</span>}
                              <span
                                onClick={(e) => removeColorOption(c.id, c.value, e)}
                                title={tx.admin("delete_color")}
                                className="mr-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white text-[10px] font-extrabold transition-all cursor-pointer"
                              >
                                ✕
                              </span>
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    {/* Custom Color Palette Adder */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 bg-[#101018] p-2.5 rounded-xl border border-white/10">
                      <div className="flex items-center gap-2 bg-[#181824] px-2.5 py-1.5 rounded-xl border border-white/10">
                        <input
                          type="color"
                          value={customColorHex}
                          onChange={e => setCustomColorHex(e.target.value)}
                          className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                          title={tx.admin("color_palette_title")}
                        />
                        <span className="text-xs font-mono text-[#D4AF37] font-bold uppercase">{customColorHex}</span>
                      </div>

                      <input
                        type="text"
                        value={customColorName}
                        onChange={e => setCustomColorName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addCustomColor())}
                        placeholder={tx.admin("color_name_placeholder")}
                        className="bg-[#181824] border border-white/10 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 flex-1"
                      />

                      <button
                        type="button"
                        onClick={addCustomColor}
                        className="bg-[#D4AF37] text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#c29c2d] transition-all whitespace-nowrap"
                      >
                        {tx.admin("add_custom_color")}
                      </button>
                    </div>
                  </div>

                  {/* Primary Image */}
                  <div className="bg-[#181824] border border-[#D4AF37]/30 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[#D4AF37] text-base font-bold flex items-center gap-2">
                        <Star className="w-5 h-5 fill-[#D4AF37]" />
                        {tx.admin("primary_image_label")}
                      </label>
                      <span className="text-gray-400 text-xs">{tx.admin("cover_hint")}</span>
                    </div>

                    {form.primary_image && form.primary_image.trim() !== "" ? (
                      <div className="relative w-full h-52 rounded-xl overflow-hidden border-2 border-[#D4AF37]/50 group bg-[#111118]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={form.primary_image}
                          alt="Main Product"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error("[primary_image] Failed to load image:", form.primary_image);
                            // Do NOT set default hero image — keep image attempt clear
                          }}
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <label className="cursor-pointer bg-[#D4AF37] text-black px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#c29c2d] transition-all flex items-center gap-1.5 shadow-lg">
                            <Upload className="w-4 h-4" /> {tx.admin("change_image")}
                            <input
                              type="file"
                              accept="image/*,image/heic,image/heif,.heic,.heif"
                              disabled={uploadingPrimary}
                              onChange={e => handlePrimaryUpload(e.target.files)}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => setForm(f => ({ ...f, primary_image: "" }))}
                            className="bg-red-500 text-white px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-600 transition-all flex items-center gap-1 shadow-lg"
                          >
                            <Trash2 className="w-4 h-4" /> {tx.admin("delete")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#D4AF37]/40 hover:border-[#D4AF37] bg-[#D4AF37]/5 hover:bg-[#D4AF37]/10 p-6 rounded-xl cursor-pointer transition-all">
                        {uploadingPrimary ? (
                          <div className="flex flex-col items-center gap-2 text-[#D4AF37]">
                            <Loader2 className="w-7 h-7 animate-spin" />
                            <span className="text-sm font-semibold text-center">{uploadStatusTextPrimary || tx.admin("upload_status_compressing")}</span>
                          </div>
                        ) : (
                          <>
                            <ImageIcon className="w-10 h-10 text-[#D4AF37]" />
                            <span className="text-sm font-bold text-white">{tx.admin("upload_primary")}</span>
                            <span className="text-xs text-gray-400">{tx.admin("compress_hint")}</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*,image/heic,image/heif,.heic,.heif"
                          disabled={uploadingPrimary}
                          onChange={e => handlePrimaryUpload(e.target.files)}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  {/* Galerie Photos & Vidéos */}
                  <div className="bg-[#14141d] border border-white/10 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-white text-base font-bold flex items-center gap-2">
                        <Upload className="w-5 h-5 text-[#D4AF37]" />
                        {tx.admin("gallery_label")}
                      </label>
                      <span className="text-gray-400 text-xs">{tx.admin("gallery_hint")}</span>
                    </div>

                    <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-white/20 hover:border-[#D4AF37] bg-white/5 hover:bg-[#D4AF37]/10 p-5 rounded-xl cursor-pointer transition-all">
                      {uploadingGallery ? (
                        <div className="flex flex-col items-center gap-2 text-[#D4AF37]">
                          <Loader2 className="w-7 h-7 animate-spin" />
                          <span className="text-sm font-semibold text-center">{uploadStatusTextGallery || tx.admin("upload_status_uploading")}</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="w-8 h-8 text-[#D4AF37]" />
                          <span className="text-sm font-bold text-white">{tx.admin("upload_gallery")}</span>
                          <span className="text-xs text-gray-400">{tx.admin("gallery_compress_hint")}</span>
                        </>
                      )}
                      <input
                        type="file"
                        multiple
                        accept="image/*,video/*,image/heic,image/heif,.heic,.heif"
                        disabled={uploadingGallery}
                        onChange={e => handleGalleryUpload(e.target.files)}
                        className="hidden"
                      />
                    </label>

                    {/* Option 2 (Secours): Manual Video Link Input (Instagram / TikTok / YouTube / MP4 Direct) */}
                    <div className="bg-[#1a1a24] p-4 rounded-xl border border-[#D4AF37]/30 space-y-3 pt-3">
                      <div className="flex items-center justify-between">
                        <label className="text-[#D4AF37] text-xs font-bold flex items-center gap-1.5">
                          <span>🔗</span>
                          <span>Option de secours : Ajouter une vidéo par lien (Instagram / TikTok / YouTube / MP4 Direct)</span>
                        </label>
                        <span className="text-[10px] text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded-full border border-[#D4AF37]/30 font-semibold">Économise R2</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          inputMode="url"
                          value={videoLinkInput}
                          onChange={e => setVideoLinkInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), handleAddVideoLink(e))}
                          className="flex-1 bg-[#101018] border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40 dir-ltr"
                          placeholder="https://www.instagram.com/reel/... ou lien direct https://.../video.mp4"
                        />
                        <button
                          type="button"
                          onClick={handleAddVideoLink}
                          onTouchEnd={handleAddVideoLink}
                          className="bg-[#D4AF37] text-black hover:bg-[#c29c2d] px-4 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap shadow-md shadow-[#D4AF37]/20 active:scale-95 touch-manipulation"
                        >
                          + Ajouter le lien
                        </button>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed bg-black/40 p-2.5 rounded-lg border border-white/5">
                        💡 <b>Astuce d'affichage :</b> Pour les liens Instagram/TikTok, les entêtes de profil ("View profile") sont automatiquement masqués pour un affichage vidéo épuré. Vous pouvez aussi coller un lien direct vers un fichier vidéo <b>.mp4</b> pour une lecture vidéo 100% directe !
                      </p>
                    </div>

                    {/* Manual Image URL Input */}
                    <div className="pt-1">
                      <label className="text-gray-400 text-xs mb-1.5 block">{tx.admin("manual_url_label")}</label>
                      <div className="flex gap-2">
                        <input
                          value={urlInput}
                          onChange={e => setUrlInput(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addUrlManual())}
                          className="flex-1 bg-[#1a1a24] border border-white/10 rounded-xl px-4 py-2.5 text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/40"
                          placeholder="https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev/..." dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={addUrlManual}
                          className="bg-[#D4AF37]/30 text-[#D4AF37] hover:bg-[#D4AF37]/50 px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
                        >
                          {tx.admin("add_url")}
                        </button>
                      </div>
                    </div>

                    {/* Media preview with Color linking */}
                    {(form.images.length > 0 || form.videos.length > 0) && (
                      <div className="space-y-3 pt-2">
                        <p className="text-xs font-bold text-gray-400">{tx.admin("uploaded_files").replace("{imgs}", String(form.images.length)).replace("{vids}", String(form.videos.length))}</p>
                        {form.colors.length > 0 && (
                          <p className="text-[11px] text-[#D4AF37]/90 bg-[#D4AF37]/10 px-3 py-1.5 rounded-lg border border-[#D4AF37]/20">
                            🎨 <b>Lier une couleur :</b> Sélectionnez la couleur correspondante sous chaque image/vidéo pour que la galerie saute automatiquement vers elle lors du clic client.
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {form.images.map((img, i) => {
                            const linkedColorId = getLinkedColorId(form.color_media_map, img);
                            const linkedColor = form.colors.find(c => c.id === linkedColorId);

                            return (
                              <div key={`img-${i}`} className="flex flex-col bg-[#111118] border border-white/10 rounded-xl overflow-hidden p-2 gap-2">
                                <div className="relative h-28 rounded-lg overflow-hidden group bg-black">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img
                                    src={img}
                                    alt={`Gallery ${i}`}
                                    className="w-full h-full object-cover"
onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/images/hero_caftan.webp";
                                    }}
                                  />
                                  <span className="absolute top-1 right-1 bg-black/70 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">{tx.admin("image_badge")}</span>
                                  {linkedColor && (
                                    <span className="absolute top-1 left-1 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shadow" style={{ borderColor: linkedColor.value }}>
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: linkedColor.value }} />
                                      {linkedColor.name}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setForm(f => {
                                      const newMap = removeMediaFromColorMap(f.color_media_map, img);
                                      return { ...f, images: f.images.filter((_, j) => j !== i), color_media_map: newMap };
                                    })}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400 hover:text-red-300 gap-1 text-xs font-bold"
                                  >
                                    <Trash2 className="w-4 h-4" /> {tx.admin("delete")}
                                  </button>
                                </div>

                                {form.colors.length > 0 && (
                                  <div className="flex items-center gap-1.5 bg-[#181824] p-1.5 rounded-lg border border-white/5">
                                    <span className="text-[10px] text-gray-400 shrink-0 font-semibold">🎨 Couleur:</span>
                                    <select
                                      value={linkedColorId}
                                      onChange={(e) => {
                                        const newColorId = e.target.value;
                                        setForm(f => {
                                          const mediaUrl = fixMediaUrl(img);
                                          const newMap = removeMediaFromColorMap(f.color_media_map, mediaUrl);
                                          if (newColorId) newMap[newColorId] = [mediaUrl];
                                          return { ...f, color_media_map: newMap };
                                        });
                                      }}
                                      className="flex-1 bg-[#101018] border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                                    >
                                      <option value="">-- Non associée --</option>
                                      {form.colors.map(c => {
                                        const usedByOther = Boolean(form.color_media_map?.[c.id]?.length) && c.id !== linkedColorId;
                                        return (
                                          <option key={c.id} value={c.id} disabled={usedByOther}>
                                            {c.name}{usedByOther ? " - deja liee" : ""}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {form.videos.map((vid, i) => {
                            const linkedColorId = getLinkedColorId(form.color_media_map, vid);
                            const linkedColor = form.colors.find(c => c.id === linkedColorId);
                            const embed = parseVideoEmbedUrl(vid);

                            return (
                              <div key={`vid-${i}`} className="flex flex-col bg-[#111118] border border-[#D4AF37]/30 rounded-xl overflow-hidden p-2 gap-2">
                                <div className="relative h-28 rounded-lg overflow-hidden bg-black group flex items-center justify-center">
                                  {embed.type !== "direct" ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center bg-black/95 text-white p-2 text-center">
                                      <span className="text-[11px] font-black uppercase text-[#D4AF37]">
                                        {embed.type === "instagram" ? "📸 Instagram Reel" : embed.type === "tiktok" ? "🎵 TikTok Video" : "▶️ YouTube"}
                                      </span>
                                      <span className="text-[9px] text-gray-400 truncate max-w-[180px] mt-1 font-mono dir-ltr">{vid}</span>
                                    </div>
                                  ) : (
                                    <>
                                      <video src={getVideoProxyUrl(vid)} className="w-full h-full object-cover pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity" muted playsInline preload="metadata" />
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-6 h-6 rounded-full bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                          <Video className="w-3.5 h-3.5 text-[#D4AF37]" />
                                        </div>
                                      </div>
                                    </>
                                  )}
                                  <span className="absolute top-1 right-1 bg-[#D4AF37] text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                                    {embed.type === "instagram" ? "Insta" : embed.type === "tiktok" ? "TikTok" : embed.type === "youtube" ? "YouTube" : tx.admin("video_badge")}
                                  </span>
                                  {linkedColor && (
                                    <span className="absolute top-1 left-1 bg-black/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shadow" style={{ borderColor: linkedColor.value }}>
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: linkedColor.value }} />
                                      {linkedColor.name}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setForm(f => {
                                      const newMap = removeMediaFromColorMap(f.color_media_map, vid);
                                      return { ...f, videos: (f.videos || []).filter((_, j) => j !== i), color_media_map: newMap };
                                    })}
                                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-red-400 hover:text-red-300 gap-1 text-xs font-bold"
                                  >
                                    <Trash2 className="w-4 h-4" /> {tx.admin("delete")}
                                  </button>
                                </div>

                                {form.colors.length > 0 && (
                                  <div className="flex items-center gap-1.5 bg-[#181824] p-1.5 rounded-lg border border-white/5">
                                    <span className="text-[10px] text-gray-400 shrink-0 font-semibold">🎨 Couleur:</span>
                                    <select
                                      value={linkedColorId}
                                      onChange={(e) => {
                                        const newColorId = e.target.value;
                                        setForm(f => {
                                          const mediaUrl = fixMediaUrl(vid);
                                          const newMap = removeMediaFromColorMap(f.color_media_map, mediaUrl);
                                          if (newColorId) newMap[newColorId] = [mediaUrl];
                                          return { ...f, color_media_map: newMap };
                                        });
                                      }}
                                      className="flex-1 bg-[#101018] border border-white/10 rounded px-2 py-1 text-white text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                                    >
                                      <option value="">-- Non associée --</option>
                                      {form.colors.map(c => {
                                        const usedByOther = Boolean(form.color_media_map?.[c.id]?.length) && c.id !== linkedColorId;
                                        return (
                                          <option key={c.id} value={c.id} disabled={usedByOther}>
                                            {c.name}{usedByOther ? " - deja liee" : ""}
                                          </option>
                                        );
                                      })}
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stock Status */}
                  <div className="flex items-center justify-between bg-[#1a1a24] p-4 rounded-xl border border-white/5">
                    <label className="text-white text-sm font-semibold">{tx.admin("stock_label")}</label>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, stock: f.stock === "available" ? "out_of_stock" : "available" }))}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        form.stock === "available" ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30" : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {form.stock === "available" ? (
                        <><CheckCircle className="w-4 h-4" /> {tx.admin("available_order")}</>
                      ) : (
                        <><XCircle className="w-4 h-4" /> {tx.admin("out_of_stock_label")}</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Wizard Navigation Actions Footer */}
              <div className="flex items-center justify-between gap-3 pt-5 border-t border-white/10">
                {currentStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCurrentStep((currentStep - 1) as 1 | 2 | 3 | 4)}
                    className="bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl font-semibold text-xs hover:bg-white/10 transition-all flex items-center gap-1"
                  >
                    ← {tx.admin("previous")}
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="bg-white/5 border border-white/10 text-gray-400 px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-white/10 hover:text-white transition-all"
                  >
                    {tx.admin("cancel")}
                  </button>

                  {currentStep < 4 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentStep((currentStep + 1) as 1 | 2 | 3 | 4)}
                      className="bg-[#D4AF37] text-black px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-[#c29c2d] shadow-lg shadow-[#D4AF37]/20 transition-all flex items-center gap-1.5"
                    >
                      {tx.admin("next")} ({tx.admin("step")} {currentStep + 1}) ➔
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={saving || uploadingPrimary || uploadingGallery}
                      onClick={handleSave}
                      className="bg-[#D4AF37] text-black px-7 py-2.5 rounded-xl font-bold text-xs hover:bg-[#c29c2d] disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-lg shadow-[#D4AF37]/20"
                    >
                      {saving ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> {tx.admin("saving")}</>
                      ) : (
                        <><CheckCircle className="w-4 h-4" /> {form.id ? tx.admin("save_changes") : tx.admin("save_product")}</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
