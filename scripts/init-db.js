#!/usr/bin/env node
// scripts/init-db.js — Executes schema.sql against Cloudflare D1 via REST API
// Run: node scripts/init-db.js

const fs   = require("fs");
const path = require("path");
const https = require("https");

// ── Load .env.local ──────────────────────────────────────────────────────────
const envPath = path.join(__dirname, "..", ".env.local");
fs.readFileSync(envPath, "utf8").split("\n").forEach(line => {
  const t = line.trim();
  if (!t || t.startsWith("#")) return;
  const eqIdx = t.indexOf("=");
  if (eqIdx < 0) return;
  const k = t.slice(0, eqIdx).trim();
  const v = t.slice(eqIdx + 1).trim().replace(/^\\/, "");
  process.env[k] = v;
});

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const DB_ID      = process.env.CLOUDFLARE_D1_DATABASE_ID;
const TOKEN      = process.env.CLOUDFLARE_D1_TOKEN;

if (!ACCOUNT_ID || !DB_ID || !TOKEN) {
  console.error("❌ Missing env vars");
  process.exit(1);
}

// ── HTTP helper ──────────────────────────────────────────────────────────────
function callD1(sql) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ sql });
    const options = {
      hostname: "api.cloudflare.com",
      path: `/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(body),
      },
    };
    const req = https.request(options, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.success) resolve(json);
          else reject(json.errors || json);
        } catch(e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(body);
    req.end();
  });
}

// ── Parse SQL into individual statements ─────────────────────────────────────
function parseStatements(sql) {
  const stmts = [];
  let current = "";
  let inSingleQuote = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];

    // Skip block comments /* ... */ entirely (do not add to statement buffer)
    if (!inSingleQuote && !inLineComment && ch === "/" && next === "*") {
      inBlockComment = true; i++; continue;
    }
    if (inBlockComment && ch === "*" && next === "/") {
      inBlockComment = false; i++; continue;
    }
    if (inBlockComment) continue;

    // Skip line comments -- ... (do not add to statement buffer, so a comment
    // never merges into the following statement and gets filtered out)
    if (!inSingleQuote && ch === "-" && next === "-") {
      inLineComment = true; continue;
    }
    if (inLineComment) {
      if (ch === "\n") inLineComment = false;
      continue;
    }

    // Track single-quoted strings (escape '' inside)
    if (ch === "'") {
      inSingleQuote = !inSingleQuote;
    }

    current += ch;

    // Statement ends at ; outside a string
    if (ch === ";" && !inSingleQuote) {
      const trimmed = current.trim();
      if (trimmed.length > 1) stmts.push(trimmed);
      current = "";
    }
  }
  const last = current.trim();
  if (last.length > 1) stmts.push(last);

  return stmts.filter(s => !/^--/.test(s) && s.length > 2);
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const schema = fs.readFileSync(path.join(__dirname, "..", "schema.sql"), "utf8");
  const stmts  = parseStatements(schema);

  console.log(`\n🚀 Executing ${stmts.length} statements on Cloudflare D1...\n`);

  let ok = 0, fail = 0;

  for (let i = 0; i < stmts.length; i++) {
    const stmt    = stmts[i];
    const preview = stmt.replace(/\s+/g, " ").slice(0, 70);
    try {
      await callD1(stmt);
      console.log(`  ✅ [${i+1}/${stmts.length}] ${preview}`);
      ok++;
    } catch (err) {
      const msg = JSON.stringify(err);
      if (msg.includes("already exists") || msg.includes("UNIQUE constraint") || msg.includes("duplicate column")) {
        console.log(`  ℹ️  [${i+1}/${stmts.length}] Already exists — OK`);
        ok++;
      } else {
        console.error(`  ❌ [${i+1}/${stmts.length}] FAILED: ${msg}`);
        console.error(`     SQL: ${stmt.slice(0, 120)}`);
        fail++;
      }
    }
    await new Promise(r => setTimeout(r, 80));
  }

  console.log(`\n──────────────────────────────────────`);
  console.log(`✨ ${ok} succeeded · ${fail} failed`);
  if (fail === 0) console.log("🎉 Database fully initialized on Cloudflare D1!");
  else            console.log("⚠️  Check errors above.");
}

main().catch(e => { console.error(e); process.exit(1); });
