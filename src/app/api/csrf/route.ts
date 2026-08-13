import { setCsrfTokenCookie } from "@/lib/csrf";
import { requireAdminSession, okResponse, errorResponse } from "@/lib/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET() {
  if (!await requireAdminSession()) return errorResponse("Unauthorized", 401);
  const token = await setCsrfTokenCookie();
  return okResponse({ csrfToken: token });
}