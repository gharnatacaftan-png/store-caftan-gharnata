"use client";

// Client-side helper for CSRF-protected admin fetches.
// /api/csrf posa un cookie httpOnly (4 h) et renvoie le token brut ; chaque
// requête mutante l'envoie via l'en-tête x-csrf-token, vérifié par
// rejectUnsafeAdminRequest côté serveur.

let cachedToken: string | null = null;

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  const res = await fetch("/api/csrf", { method: "GET", cache: "no-store" });
  if (!res.ok) return "";
  const data = await res.json();
  cachedToken = String(data?.csrfToken || "");
  return cachedToken;
}

export function csrfHeaders(extra?: Record<string, string>): Promise<Record<string, string>> {
  return getCsrfToken().then((token) => ({
    ...(token ? { "x-csrf-token": token } : {}),
    ...extra,
  }));
}