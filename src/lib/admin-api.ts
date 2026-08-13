import { NextRequest } from "next/server";
import { validateCsrfToken } from "./csrf";
import { errorResponse, isSameOrigin } from "./security";
import { requireAdminSession } from "@/lib/security";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function isAdminRequest(_req?: NextRequest): Promise<boolean> {
  return Boolean(await requireAdminSession());
}

export function isSameOriginRequest(req: NextRequest) {
  return isSameOrigin(req);
}

export async function rejectUnsafeAdminRequest(req: NextRequest) {
  if (!await isAdminRequest(req)) {
    return errorResponse("Unauthorized", 401);
  }

  if (!isSameOriginRequest(req)) {
    return errorResponse("Forbidden", 403);
  }

  if (["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    const isValidCsrf = await validateCsrfToken(req);
    if (!isValidCsrf) {
      return errorResponse("Invalid CSRF token", 403);
    }
  }

  return null;
}