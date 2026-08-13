import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { sameOriginHosts } from "@/lib/security";

const ADMIN_BASE = "/gharnata-portal-x92";
const ADMIN_API_BASE = "/api/admin";
const LOGIN_PATH = `${ADMIN_BASE}/login`;

function withSecurityHeaders(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev https://*.r2.dev; media-src 'self' blob: https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev https://*.r2.dev; connect-src 'self' https://pub-60b4679aa7b4477b838c988b7a0b3d45.r2.dev https://*.r2.dev https://*.r2.cloudflarestorage.com https://api.telegram.org; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAdminPage = pathname.startsWith(ADMIN_BASE);
  const isAdminApi = pathname.startsWith(ADMIN_API_BASE);

  // Only guard the admin route group and admin APIs.
  if (!isAdminPage && !isAdminApi) return NextResponse.next();

  // Block cross-origin requests to admin API endpoints
  if (isAdminApi) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host) {
      try {
        if (!sameOriginHosts(new URL(origin).host, host)) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }

  // Allow login page without auth check
  if (pathname === LOGIN_PATH) return withSecurityHeaders(NextResponse.next());

  // Check session
  const response = NextResponse.next();
  const session = await getIronSession<SessionData>(request, response, sessionOptions);

  // 4-hour max session lifetime, mirroring requireAdminSession() in lib/security.
  const expired = !session.loginAt || Date.now() - session.loginAt > 4 * 60 * 60 * 1000;

  if (!session.isAdmin || expired) {
    if (session.isAdmin) session.destroy();
    // Hide the admin surface completely when the session is missing or expired.
    return withSecurityHeaders(NextResponse.rewrite(new URL("/404", request.url)));
  }

  return withSecurityHeaders(response);
}

export const config = {
  matcher: ["/gharnata-portal-x92/:path*", "/api/admin/:path*"],
};
