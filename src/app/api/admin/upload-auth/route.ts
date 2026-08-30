import { NextResponse, NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin-api";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const isAdmin = await isAdminRequest(req);
  
  if (!isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Make sure to set this in Vercel environment variables!
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret) {
    console.error("Missing ADMIN_SESSION_SECRET in environment variables");
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  return NextResponse.json({ secret });
}
