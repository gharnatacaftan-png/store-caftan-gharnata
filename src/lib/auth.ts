import { SessionOptions } from "iron-session";
// bcryptjs : implémentation pure JS/WASM de bcrypt, supportée par Cloudflare
// Workers (le module natif `bcrypt` ne l'est pas).
import bcrypt from "bcryptjs";

export interface SessionData {
  isAdmin?: boolean;
  adminId?: string;
  loginAt?: number;
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  return "dev-only-caftan-granada-session-secret-min-32-chars!!";
}

export const sessionOptions: SessionOptions = {
  password: getSessionSecret(),
  cookieName: process.env.NODE_ENV === "production" ? "__Host-cg_admin_session" : "cg_admin_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "strict",
    path: "/",
    // No maxAge = session cookie (expires when browser closes)
    // This ensures user must log in again after closing the browser/tab
  },
};

// Password hashing with bcrypt
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Rate limiting store (in-memory — resets on server restart, fine for V1)
const loginAttempts = new Map<string, { count: number; blockedUntil: number }>();

export function checkRateLimit(ip: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const record = loginAttempts.get(ip);

  if (record) {
    if (record.blockedUntil > now) {
      return { allowed: false, remainingTime: Math.ceil((record.blockedUntil - now) / 60000) };
    }
    if (record.blockedUntil <= now && record.count >= 5) {
      // Reset after block period
      loginAttempts.delete(ip);
    }
  }
  return { allowed: true };
}

export function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = loginAttempts.get(ip) || { count: 0, blockedUntil: 0 };
  record.count += 1;
  if (record.count >= 5) {
    record.blockedUntil = now + 15 * 60 * 1000; // Block for 15 minutes
  }
  loginAttempts.set(ip, record);
}

export function clearAttempts(ip: string): void {
  loginAttempts.delete(ip);
}

// ── Cached admin password hash ─────────────────────────────────────────────
// The login flow must resolve the admin bcrypt hash on every attempt. Fetching
// it from D1 (Cloudflare REST API) adds a network round-trip each time — on a
// slow connection that alone makes the login button spin for seconds. We cache
// the resolved hash in-memory for a short TTL; changePasswordAction() explicitly
// invalidates it so a password change is reflected immediately.
let cachedAdminHash: string | null = null;
let cachedAdminHashAt = 0;
const ADMIN_HASH_TTL = 60_000; // 1 minute

export function getCachedAdminPasswordHash(): string | null {
  if (cachedAdminHash && Date.now() - cachedAdminHashAt < ADMIN_HASH_TTL) {
    return cachedAdminHash;
  }
  return null;
}

export function setCachedAdminPasswordHash(hash: string): void {
  cachedAdminHash = hash;
  cachedAdminHashAt = Date.now();
}

export function invalidateCachedAdminPasswordHash(): void {
  cachedAdminHash = null;
  cachedAdminHashAt = 0;
}
