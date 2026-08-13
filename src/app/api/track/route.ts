// app/api/track/route.ts - Visit Tracker API (fire-and-forget from client)
import { NextRequest } from "next/server";
import { createHash } from "crypto";
import { d1Execute } from "@/lib/db";
import { getClientIp, rateLimit, sanitizeString, okResponse } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function isTrackablePath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.includes("\\") || path.includes("..")) return false;
  if (path.length > 300) return false;
  return !(
    path.startsWith("/gharnata-portal-x92") ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path === "/favicon.ico"
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!rateLimit(`track:${ip}`, { windowMs: 60_000, max: 30 })) {
      return okResponse({ skipped: true }, 200);
    }

    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentLength > 2048) return okResponse({ skipped: true }, 200);

    const body = await req.json().catch(() => ({}));
    const path = sanitizeString(body?.path || "/", 300);

    if (!isTrackablePath(path)) return okResponse({ skipped: true }, 200);

    const userAgent = sanitizeString(req.headers.get("user-agent") || "", 300);
    if (/bot|crawler|spider|headless|chrome-lighthouse|googlebot|bingbot|slurp/i.test(userAgent)) {
      return okResponse({ isBot: true }, 200);
    }

    const deviceType = /mobile|android|iphone|ipad|ipod/i.test(userAgent) ? "Mobile" : "Desktop";
    const today = new Date().toISOString().split("T")[0];
    const visitorHash = createHash("sha256").update(`${ip}:${today}:${process.env.SESSION_SECRET || "dev"}`).digest("hex").slice(0, 32);

    await d1Execute(
      `INSERT INTO site_visits (page_path, visitor_hash, device_type) VALUES (?, ?, ?)`,
      [path, visitorHash, deviceType]
    );

    return okResponse({ ok: true }, 200);
  } catch (err) {
    console.warn("[api/track]", err);
    return okResponse({ ok: false }, 200);
  }
}