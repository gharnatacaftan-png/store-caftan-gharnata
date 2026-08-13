#!/usr/bin/env node
/**
 * Generates an ADMIN_PASSWORD_HASH for Cloudflare Workers secrets.
 *
 * Usage:
 *   node scripts/generate-admin-hash.js "your-password"
 *   node scripts/generate-admin-hash.js      # prompts for the password
 *
 * Copy the output into:
 *   npx wrangler secret put ADMIN_PASSWORD_HASH
 * (dotenv is not needed — no env vars required.)
 */

const bcrypt = require("bcryptjs");
const readline = require("readline");

const BCRYPT_ROUNDS = 12;

function promptPassword() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question("Password (hidden): ", (value) => {
      rl.close();
      resolve(value);
    });
  });
}

async function main() {
  let password = process.argv[2];
  if (!password) password = await promptPassword();
  if (!password || password.length < 8) {
    console.error("❌ Password must be at least 8 characters.");
    process.exit(1);
  }
  const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  console.log("\n✅ ADMIN_PASSWORD_HASH:\n" + hash + "\n");
  console.log("Set it into the Worker:");
  console.log("  npx wrangler secret put ADMIN_PASSWORD_HASH");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});