import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData } from "@/lib/auth";
import { requireAdminSession, okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function POST() {
  if (!await requireAdminSession()) return errorResponse("Unauthorized", 401);
  const cookieStore = await cookies();
  // iron-session expects its own CookieStore interface (not exported);
  // Next.js ReadonlyRequestCookies is structurally compatible at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- bridge between incompatible library types
  const session = await getIronSession<SessionData>(cookieStore as any, sessionOptions);
  session.destroy();
  return okResponse({ ok: true });
}
