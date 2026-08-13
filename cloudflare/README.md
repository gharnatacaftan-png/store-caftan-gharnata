# Cloudflare D1 + R2 Setup

This project runs on Cloudflare Workers (via `opennextjs-cloudflare`) with:

- **D1** for products, orders, shipping rates, settings, media metadata, visits.
- **R2** for product image/video files (accessed through the public R2 domain).

The app talks to D1/R2 through the Cloudflare **REST API** (`src/lib/db.ts`,
`src/lib/r2.ts`), not through worker bindings, so every credential below must
exist as a Worker secret (or var).

## 1. Install Cloudflare tooling

```powershell
npm install @opennextjs/cloudflare@latest
npm install --save-dev wrangler@latest
```

## 2. Login to Cloudflare

```powershell
npx wrangler login
```

## 3. Create D1 database

```powershell
npx wrangler d1 create caftan-gharnata-db
```

Copy the returned `database_id` into `wrangler.toml` (`[d1_databases]`).

## 4. Create R2 bucket

```powershell
npx wrangler r2 bucket create caftan-gharnata-media
```

Then configure a **public custom domain** for the bucket in Cloudflare R2 and
use that URL as `R2_PUBLIC_URL` (also allowlisted in `next.config.ts`).

## 5. Wrangler config

Active config lives in `wrangler.toml` (see `cloudflare/wrangler.example.jsonc`
for a commented template). Fill in `database_id` if you created a new DB.

## 6. Apply D1 schema and seed

The canonical schema is `schema.sql`. It is deployed through the D1 migrations
in `cloudflare/migrations/` (current migration: `0001_init.sql`, which mirrors
the final schema and is safe to run on an empty DB **or** on one already
seeded via `scripts/init-db.js`).

```powershell
npm run d1:migrate:remote
npm run d1:seed:remote
```

For local D1 testing:

```powershell
npm run d1:migrate:local
npm run d1:seed:local
```

If your remote D1 was initialized before `color_media_map` existed, add the
missing column (safe to re-run):

```powershell
node scripts/apply-d1-sql.js cloudflare/add_color_media_map.sql
```

## 7. Required secrets

Set these in Cloudflare Workers settings:

```txt
SESSION_SECRET
ADMIN_PASSWORD_HASH
```

`SESSION_SECRET` and `ADMIN_PASSWORD_HASH` are **mandatory**: without them the
app fails closed (login refuses to work). Generate the admin hash with:

```powershell
node scripts/generate-admin-hash.js "your-password-here"
npx wrangler secret put ADMIN_PASSWORD_HASH
```

And, because D1/R2 are accessed through the Cloudflare REST API:

```txt
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_D1_DATABASE_ID
CLOUDFLARE_D1_TOKEN
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_URL
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Keep `.env.local` only for local development — it best never matches production.

## 8. Next coding phase

After the above, the app stores everything in D1/R2. The remaining local-JSON
adapters (`data/*.json`) are used only as a development fallback when D1/R2 are
unreachable — not in production.