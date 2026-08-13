#!/usr/bin/env node
/**
 * Migration script: Add name_fr and name_en columns to shipping_rates
 * Run with: node scripts/migrate-d1.js
 */

async function runMigration() {
  const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
  const CLOUDFLARE_D1_TOKEN = process.env.CLOUDFLARE_D1_TOKEN;
  const D1_DATABASE_ID = process.env.D1_DATABASE_ID || "cdfcca5a-2f69-4a16-a406-cfe957e35f85";

  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_D1_TOKEN) {
    console.error("❌ Missing environment variables:");
    console.error("   CLOUDFLARE_ACCOUNT_ID");
    console.error("   CLOUDFLARE_D1_TOKEN");
    console.error("\nSet them in your .env.local file");
    process.exit(1);
  }

  const migrations = [
    // Step 1: Add columns (will error if they exist, but we catch that)
    `ALTER TABLE shipping_rates ADD COLUMN name_fr TEXT`,
    `ALTER TABLE shipping_rates ADD COLUMN name_en TEXT`,
  ];

  console.log("🚀 Starting D1 migration...\n");

  // Run ALTER TABLE migrations
  for (const sql of migrations) {
    try {
      console.log(`   Executing: ${sql}`);
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${CLOUDFLARE_D1_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql }),
        }
      );

      const data = await res.json();
      if (!data.success) {
        // Check if error is "duplicate column" (that's OK, means already migrated)
        const isDuplicate = data.errors?.some(e => e.message?.includes("duplicate column"));
        if (isDuplicate) {
          console.log(`   ⚠️  Column already exists, skipping\n`);
        } else {
          console.error(`   ❌ Failed:`, data.errors);
          throw new Error("Migration failed");
        }
      } else {
        console.log(`   ✅ Success\n`);
      }
    } catch (err) {
      console.error(`   ❌ Error:`, err.message);
      throw err;
    }
  }

  // Step 2: Update all 58 wilayas with French and English names
  console.log("📝 Populating wilaya names (French & English)...\n");

  const updates = [
    [1, "Adrar", "Adrar"],
    [2, "Chlef", "Chlef"],
    [3, "Laghouat", "Laghouat"],
    [4, "Oum El Bouaghi", "Oum El Bouaghi"],
    [5, "Batna", "Batna"],
    [6, "Béjaïa", "Bejaia"],
    [7, "Biskra", "Biskra"],
    [8, "Béchar", "Bechar"],
    [9, "Blida", "Blida"],
    [10, "Bouira", "Bouira"],
    [11, "Tamanrasset", "Tamanrasset"],
    [12, "Tébessa", "Tebessa"],
    [13, "Tlemcen", "Tlemcen"],
    [14, "Tiaret", "Tiaret"],
    [15, "Tizi Ouzou", "Tizi Ouzou"],
    [16, "Alger", "Algiers"],
    [17, "Djelfa", "Djelfa"],
    [18, "Jijel", "Jijel"],
    [19, "Sétif", "Setif"],
    [20, "Saïda", "Saida"],
    [21, "Skikda", "Skikda"],
    [22, "Sidi Bel Abbès", "Sidi Bel Abbes"],
    [23, "Annaba", "Annaba"],
    [24, "Guelma", "Guelma"],
    [25, "Constantine", "Constantine"],
    [26, "Médéa", "Medea"],
    [27, "Mostaganem", "Mostaganem"],
    [28, "M'Sila", "M'Sila"],
    [29, "Mascara", "Mascara"],
    [30, "Ouargla", "Ouargla"],
    [31, "Oran", "Oran"],
    [32, "El Bayadh", "El Bayadh"],
    [33, "Illizi", "Illizi"],
    [34, "Bordj Bou Arréridj", "Bordj Bou Arreridj"],
    [35, "Boumerdès", "Boumerdes"],
    [36, "El Tarf", "El Tarf"],
    [37, "Tindouf", "Tindouf"],
    [38, "Tissemsilt", "Tissemsilt"],
    [39, "El Oued", "El Oued"],
    [40, "Khenchela", "Khenchela"],
    [41, "Souk Ahras", "Souk Ahras"],
    [42, "Tipaza", "Tipaza"],
    [43, "Mila", "Mila"],
    [44, "Aïn Defla", "Ain Defla"],
    [45, "Naâma", "Naama"],
    [46, "Aïn Témouchent", "Ain Temouchent"],
    [47, "Ghardaïa", "Ghardaia"],
    [48, "Relizane", "Relizane"],
    [49, "El M'Ghair", "El M'Ghair"],
    [50, "El Meniaa", "El Meniaa"],
    [51, "Ouled Djellal", "Ouled Djellal"],
    [52, "Bordj Badji Mokhtar", "Bordj Badji Mokhtar"],
    [53, "Béni Abbès", "Beni Abbes"],
    [54, "Timimoun", "Timimoun"],
    [55, "Touggourt", "Touggourt"],
    [56, "Djanet", "Djanet"],
    [57, "In Salah", "In Salah"],
    [58, "In Guezzam", "In Guezzam"],
  ];

  for (const [code, nameFr, nameEn] of updates) {
    const sql = `UPDATE shipping_rates SET name_fr = '${nameFr.replace(/'/g, "''")}', name_en = '${nameEn.replace(/'/g, "''")}' WHERE wilaya_code = ${code}`;

    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${D1_DATABASE_ID}/query`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${CLOUDFLARE_D1_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sql }),
        }
      );

      const data = await res.json();
      if (!data.success) {
        console.error(`   ❌ Failed wilaya ${code}:`, data.errors);
        throw new Error("Update failed");
      }
      process.stdout.write(`   ✅ Wilaya ${code} (${nameFr})\r`);
    } catch (err) {
      console.error(`\n   ❌ Error updating wilaya ${code}:`, err.message);
      throw err;
    }
  }

  console.log("\n\n✅ Migration completed successfully!");
  console.log("   - Columns name_fr and name_en added");
  console.log("   - All 58 wilayas populated with French & English names");
}

runMigration().catch(err => {
  console.error("\n❌ Migration failed:", err.message);
  process.exit(1);
});
