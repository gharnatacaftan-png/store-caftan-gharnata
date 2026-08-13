#!/usr/bin/env node
/**
 * Applique scripts/migrate-shipping-rates.sql sur la base D1 de production.
 * - Ajoute les colonnes name_fr / name_en si absentes (ignore "duplicate column")
 * - Vide shipping_rates et réinsère les 58 wilayas avec les tarifs officiels
 *
 * Usage: node scripts/apply-shipping-migration.js
 * (lit les identifiants depuis .env.local)
 */

const fs = require("fs");
const path = require("path");

// ── Charge .env.local sans dépendance externe ─────────────────────────────
function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
loadEnvLocal();

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const TOKEN = process.env.CLOUDFLARE_D1_TOKEN;
const DB_ID = process.env.CLOUDFLARE_D1_DATABASE_ID;

if (!ACCOUNT_ID || !TOKEN || !DB_ID) {
  console.error("❌ Variables manquantes dans .env.local: CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_D1_DATABASE_ID / CLOUDFLARE_D1_TOKEN");
  process.exit(1);
}

const ENDPOINT = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`;

async function runSql(sql, { tolerateDuplicate = false } = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ sql }),
  });
  const data = await res.json();
  if (!data.success) {
    const msg = (data.errors || []).map(e => e.message).join(" | ");
    if (tolerateDuplicate && /duplicate column/i.test(msg)) return { skipped: true };
    throw new Error(`D1 error: ${msg}`);
  }
  return { ok: true, results: data.result?.[0]?.results ?? [] };
}

// ── Découpe le fichier SQL en statements (ignore commentaires) ─────────────
function parseStatements(sqlText) {
  const withoutComments = sqlText
    .split(/\r?\n/)
    .filter(l => !l.trim().startsWith("--"))
    .join("\n");
  return withoutComments
    .split(";")
    .map(s => s.trim())
    .filter(Boolean);
}

async function main() {
  const sqlPath = path.join(__dirname, "migrate-shipping-rates.sql");
  const statements = parseStatements(fs.readFileSync(sqlPath, "utf-8"));
  console.log(`🚀 ${statements.length} statements à exécuter depuis migrate-shipping-rates.sql\n`);

  let applied = 0, skipped = 0;
  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, " ").slice(0, 70);
    try {
      const out = await runSql(stmt, { tolerateDuplicate: stmt.startsWith("ALTER TABLE") });
      if (out.skipped) {
        skipped++;
        console.log(`   ⏭️  Déjà présent: ${preview}...`);
      } else {
        applied++;
      }
    } catch (err) {
      console.error(`   ❌ Échec sur: ${preview}...`);
      console.error(`      ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`\n✅ Migration appliquée — ${applied} statements exécutés, ${skipped} ignorés.`);

  // ── Vérification finale ──────────────────────────────────────────────────
  const check = await runSql(
    `SELECT COUNT(*) AS n, SUM(CASE WHEN name_fr IS NULL OR name_fr = '' THEN 1 ELSE 0 END) AS missing_fr FROM shipping_rates`
  );
  const row = check.results[0] || {};
  console.log(`📊 shipping_rates: ${row.n} wilayas, ${row.missing_fr} sans nom français.`);

  const sample = await runSql(
    `SELECT wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk FROM shipping_rates WHERE wilaya_code IN (1, 16, 58) ORDER BY wilaya_code`
  );
  for (const r of sample.results) {
    console.log(`   ${r.wilaya_code} — ${r.wilaya_name} / ${r.name_fr} / ${r.name_en} — ${r.price_home}/${r.price_desk} DA`);
  }
}

main().catch(err => {
  console.error("\n❌ Migration échouée:", err.message);
  process.exit(1);
});
