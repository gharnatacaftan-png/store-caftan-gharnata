#!/usr/bin/env node
/**
 * Runner générique de migration SQL vers la base D1 de production.
 * Exécute chaque statement du fichier passé en argument (ignore les
 * erreurs "duplicate column" sur les ALTER TABLE → ré-exécutable).
 *
 * Usage: node scripts/apply-d1-sql.js scripts/migrate-social-settings.sql
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

const sqlArg = process.argv[2];
if (!sqlArg) {
  console.error("Usage: node scripts/apply-d1-sql.js <chemin/vers/fichier.sql>");
  process.exit(1);
}
const sqlPath = path.resolve(process.cwd(), sqlArg);
if (!fs.existsSync(sqlPath)) {
  console.error(`❌ Fichier introuvable: ${sqlPath}`);
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
  const statements = parseStatements(fs.readFileSync(sqlPath, "utf-8"));
  console.log(`🚀 ${statements.length} statements à exécuter depuis ${path.basename(sqlPath)}\n`);

  let applied = 0, skipped = 0;
  for (const stmt of statements) {
    const preview = stmt.replace(/\s+/g, " ").slice(0, 80);
    try {
      const out = await runSql(stmt, { tolerateDuplicate: /^ALTER TABLE/i.test(stmt) });
      if (out.skipped) {
        skipped++;
        console.log(`   ⏭️  Déjà présent: ${preview}`);
      } else {
        applied++;
        console.log(`   ✔️  ${preview}`);
      }
    } catch (err) {
      console.error(`   ❌ Échec sur: ${preview}`);
      console.error(`      ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`\n✅ Migration terminée — ${applied} exécutés, ${skipped} déjà présents.`);
}

main().catch(err => {
  console.error("\n❌ Migration échouée:", err.message);
  process.exit(1);
});
