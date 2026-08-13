import "server-only";
// lib/db.ts
// Cloudflare D1 via REST API — fonctionne depuis Next.js (Vercel ou local)

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!;
const CF_D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID!;
const CF_D1_TOKEN = process.env.CLOUDFLARE_D1_TOKEN!;

const D1_BASE = `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/d1/database/${CF_D1_DATABASE_ID}`;

// Fetch with a hard timeout so a slow/unreachable D1 REST endpoint can never
// hang the login flow or an admin action indefinitely (fail fast instead).
async function d1Fetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(`${D1_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Core query function
// ---------------------------------------------------------------------------
export async function d1Query<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<T[]> {
  const res = await d1Fetch("/query", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_D1_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 query failed: ${res.status} — ${text}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(`D1 error: ${JSON.stringify(json.errors)}`);
  }

  // D1 REST returns array of result sets (one per statement)
  return (json.result?.[0]?.results ?? []) as T[];
}

// Single row helper
export async function d1QueryFirst<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<T | null> {
  const rows = await d1Query<T>(sql, params);
  return rows[0] ?? null;
}

// Execute (INSERT / UPDATE / DELETE) — returns meta
export async function d1Execute(
  sql: string,
  params: (string | number | boolean | null)[] = []
): Promise<{ last_row_id: number; changes: number }> {
  const res = await d1Fetch("/query", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${CF_D1_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql, params }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`D1 execute failed: ${res.status} — ${text}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error(`D1 error: ${JSON.stringify(json.errors)}`);
  }

  return json.result?.[0]?.meta ?? { last_row_id: 0, changes: 0 };
}
