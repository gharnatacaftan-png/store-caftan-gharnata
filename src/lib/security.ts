// lib/security.ts - Central security utilities for all API routes
import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Rate Limiting — Map-based (per-worker instance)
// ---------------------------------------------------------------------------
// In a serverless/edge environment each isolate has its own memory, so
// rate-limit counters are per-instance. This is still effective because:
//   1. Cloudflare Workers spin up a limited number of isolates per region.
//   2. A single abusive IP will hit the same isolate repeatedly (affinity).
//   3. For stronger protection, combine with Cloudflare WAF rules or D1-backed
//      counters (see: https://developers.cloudflare.com/workers/examples/rate-limiting/)
//
// The cleanup runs lazily on each call instead of via setInterval to avoid
// serverless compatibility issues (timers in serverless runtimes may be
// unreliable or cause cold-start penalties).
// ---------------------------------------------------------------------------

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

interface RateLimitOptions {
  windowMs: number;
  max: number;
}

/** Lazy cleanup — runs at most once per 5 minutes, triggered by requests. */
let lastCleanup = 0;
function maybeCleanup() {
  const now = Date.now();
  if (now - lastCleanup < 5 * 60 * 1000) return;
  lastCleanup = now;
  for (const [k, v] of rateLimitStore) {
    if (now > v.resetAt) rateLimitStore.delete(k);
  }
}

export function rateLimit(key: string, opts: RateLimitOptions): boolean {
  maybeCleanup();
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + opts.windowMs });
    return true;
  }

  if (record.count >= opts.max) return false;
  record.count++;
  return true;
}

export function getClientIp(req: Request): string {
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "unknown";
}

export function sanitizeString(value: unknown, maxLen = 200): string {
  if (typeof value !== "string") return "";
  return value
    .trim()
    .slice(0, maxLen)
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "");
}

export function sanitizeNumber(value: unknown, min = 0, max = 9_999_999): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.floor(n);
}

export function isValidAlgerianPhone(phone: string): boolean {
  return /^0[5-7]\d{8}$/.test(phone.replace(/\s/g, ""));
}

export function isValidWilayaCode(code: number): boolean {
  return Number.isInteger(code) && code >= 1 && code <= 58;
}

export function isValidDeliveryType(type: unknown): type is "HOME" | "DESK" {
  return type === "HOME" || type === "DESK";
}

export function isValidOrderStatus(status: unknown): boolean {
  return ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED"].includes(status as string);
}

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
  "image/pjpeg",
  "image/x-png",
  "image/bmp",
  "image/x-ms-bmp",
  "image/tiff",
  "application/octet-stream",
];
export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/mov",
  "video/x-matroska",
  "video/avi",
  "video/x-msvideo",
  "video/3gpp",
  "video/3gpp2",
  "video/ogg",
  "video/x-flv",
  "video/mpeg",
  "video/mp2t",
  "video/x-ms-wmv",
  "video/x-m4v",
];
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

export function isAllowedFileType(mime: string): boolean {
  return [...ALLOWED_IMAGE_TYPES, ...ALLOWED_VIDEO_TYPES].includes(mime);
}

const JSON_SECURITY_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Cache-Control": "no-store, no-cache, must-revalidate, private",
  "Pragma": "no-cache",
};

export function okResponse(data: Record<string, unknown>, status = 200, customHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...JSON_SECURITY_HEADERS,
      ...(customHeaders || {}),
    },
  });
}

export function errorResponse(message: string, status = 400): Response {
  const safeMessage = status >= 500 ? "خطأ في الخادم" : message;
  return new Response(JSON.stringify({ error: safeMessage }), {
    status,
    headers: JSON_SECURITY_HEADERS,
  });
}

export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = req.headers.get("host");
  if (!host) return false;
  return sameOriginHosts(originHost, host);
}

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "::ffff:127.0.0.1", "0.0.0.0"]);

/** Normalize a Host/Origin host to compare them robustly (default port, IPv6 brackets). */
export function normalizeOriginHost(host: string): string {
  let h = host.trim().toLowerCase();
  if (h.startsWith("[")) {
    const close = h.indexOf("]");
    if (close !== -1) h = h.slice(0, close + 1);
  }
  h = h.replace(/:\d+$/, "");
  if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
  return h;
}

/** True when two hosts refer to the same endpoint (exact match or localhost aliases). */
export function sameOriginHosts(a: string, b: string): boolean {
  const na = normalizeOriginHost(a);
  const nb = normalizeOriginHost(b);
  if (na === nb) return true;
  if (LOOPBACK_HOSTS.has(na) && LOOPBACK_HOSTS.has(nb)) return true;
  return false;
}

export async function requireAdminSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await getIronSession<SessionData>(cookieStore as any, sessionOptions);
    if (!session.isAdmin) return null;

    const loginAt = session.loginAt ?? 0;
    if (Date.now() - loginAt > 4 * 60 * 60 * 1000) {
      session.destroy();
      return null;
    }

    return session;
  } catch {
    return null;
  }
}