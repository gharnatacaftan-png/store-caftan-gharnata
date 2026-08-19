"use server";

import { cookies } from "next/headers";
import { getIronSession } from "iron-session";
import { sessionOptions, SessionData, checkRateLimit, recordFailedAttempt, clearAttempts, verifyPassword, hashPassword, getCachedAdminPasswordHash, setCachedAdminPasswordHash, invalidateCachedAdminPasswordHash } from "@/lib/auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { adminT } from "@/lib/admin-lang";
import { d1QueryFirst, d1Execute } from "@/lib/db";
import { recordLoginLog } from "@/lib/login-logs";

// iron-session expects a CookieStore with a different `set` signature than
// Next.js provides. We must cast through `any` — this is a known incompatibility
// between the two libraries and cannot be solved without a wrapper.

// Resolve the admin password hash, in priority order:
//   1. Cached copy (in-memory, 60s TTL) — avoids a D1 REST round-trip on every
//      login attempt, which was making the login button spin for ~1.5s.
//   2. admin_users table (set via the dashboard "change password" feature) —
//      this is what wins once the owner has changed the password.
//   3. ADMIN_PASSWORD_HASH env var.
// Aucun hash par défaut n'est embarqué dans le code : si ni la table ni l'env
// ne fournit de hash, on refuse de démarrer la connexion (fail-closed).
async function getAdminPasswordHash(): Promise<string> {
  const cached = getCachedAdminPasswordHash();
  if (cached) return cached;

  try {
    const row = await d1QueryFirst<{ password_hash: string | null }>(
      `SELECT password_hash FROM admin_users WHERE username = 'admin' LIMIT 1`
    );
    if (row?.password_hash) {
      setCachedAdminPasswordHash(row.password_hash);
      return row.password_hash;
    }
  } catch {
    // admin_users table missing (not migrated yet) — fall through to env.
  }

  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (hash) {
    setCachedAdminPasswordHash(hash);
    return hash;
  }
  throw new Error("ADMIN_PASSWORD_HASH must be set (env or admin_users table). Run the hash generation script.");
}

export async function loginAction(formData: FormData) {
  const password = String(formData.get("password") || "").trim();

  // Get client IP for rate limiting — Cloudflare sets cf-connecting-ip (the
  // true client IP). x-forwarded-for is only a fallback for local dev.
  const headersList = await headers();
  const ip =
    headersList.get("cf-connecting-ip") ||
    headersList.get("x-forwarded-for")?.split(",")[0].trim() ||
    "unknown";
  const userAgent = headersList.get("user-agent") || "";

  // Rate limit check
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    const admin = await adminT();
    return { error: admin("login_blocked").replace("{minutes}", String(rateCheck.remainingTime)) };
  }

  // Fast path — no D1 round-trip: the cached hash or the env hash (initial
  // deployment) usually still matches. Only if that fails do we hit D1, because
  // a password changed via the dashboard lives in admin_users and supersedes
  // the (stale) env hash.
  const candidate = getCachedAdminPasswordHash() || process.env.ADMIN_PASSWORD_HASH || null;

  let isValid = false;
  if (candidate) {
    isValid = await verifyPassword(password || "", candidate);
  }

  if (!isValid) {
    // Slow path — one D1 REST call (also covers "no env hash configured").
    try {
      const row = await d1QueryFirst<{ password_hash: string | null }>(
        `SELECT password_hash FROM admin_users WHERE username = 'admin' LIMIT 1`
      );
      if (row?.password_hash) {
        setCachedAdminPasswordHash(row.password_hash);
        isValid = await verifyPassword(password || "", row.password_hash);
      }
    } catch {
      // admin_users table missing (not migrated yet) — env hash was the only source.
    }
  }

   if (!isValid) {
    recordFailedAttempt(ip);
    // Best-effort audit: record the FAILED attempt (never blocks login).
    void recordLoginLog({ ip, userAgent, success: false });
    const admin = await adminT();
    return { error: admin("wrong_password") };
  }

  // Success — create session
  clearAttempts(ip);
  const cookieStore = await cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<SessionData>(cookieStore as any, sessionOptions);
  session.isAdmin = true;
  session.adminId = "admin";
  session.loginAt = Date.now();
  await session.save();

  // Best-effort audit: record the SUCCESSFUL login (never blocks the redirect).
  void recordLoginLog({ ip, userAgent, success: true });

  return { ok: true, redirectTo: "/gharnata-portal-x92" };
}

// Change the dashboard password from the settings page. The new password is
// hashed with bcrypt (12 rounds — same strength as the initial one) and stored
// in admin_users, never in plain text. The old password is required to confirm
// the identity of the person performing the change.
export async function changePasswordAction(formData: FormData) {
  const session = await getAdminSession();
  const admin = await adminT();
  if (!session.isAdmin) return { error: admin("unauthorized") };

  const current = String(formData.get("currentPassword") || "");
  const next = String(formData.get("newPassword") || "");
  const confirm = String(formData.get("confirmPassword") || "");

  if (next !== confirm) return { error: admin("password_mismatch") };
  if (next.length < 8) return { error: admin("password_too_short") };
  if (next.length > 72) return { error: admin("password_too_long") };
  if (next === current) return { error: admin("password_same") };

  // Verify the current password before allowing any change.
  const currentHash = await getAdminPasswordHash();
  const isValid = await verifyPassword(current, currentHash);
  if (!isValid) return { error: admin("password_wrong_current") };

  // Hash the new password and persist it in D1 (admin_users).
  const newHash = await hashPassword(next);
  try {
    await d1Execute(
      `INSERT INTO admin_users (username, password_hash) VALUES ('admin', ?)
       ON CONFLICT(username) DO UPDATE SET password_hash = excluded.password_hash`,
      [newHash]
    );
    // Invalidating after a successful write guarantees the very next login uses
    // the freshly stored hash (never a stale in-memory copy from the old one).
    invalidateCachedAdminPasswordHash();
  } catch (err) {
    console.error("[changePasswordAction] save failed:", err);
    return { error: admin("password_update_failed") };
  }

  return { ok: true };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<SessionData>(cookieStore as any, sessionOptions);
  session.destroy();
  redirect("/gharnata-portal-x92/login");
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session = await getIronSession<SessionData>(cookieStore as any, sessionOptions);
  if (!session.isAdmin) return session;

  // Mirror the 4-hour expiry enforced by proxy.ts and requireAdminSession().
  const loginAt = session.loginAt ?? 0;
  if (Date.now() - loginAt > 4 * 60 * 60 * 1000) {
    session.destroy();
  }
  return session;
}
