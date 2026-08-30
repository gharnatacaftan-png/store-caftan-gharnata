import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  
  if (!session || !session.isLoggedIn) {
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
