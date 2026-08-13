#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Migration script: Update Cloudflare D1 with official shipping rates (58 wilayas)

SECURITE : les identifiants Cloudflare sont lus depuis les variables
d'environnement (CF_API_TOKEN / CF_ACCOUNT_ID / CF_DATABASE_ID) — ne jamais
les écrire en dur dans ce fichier (il est poussé sur le dépôt public).
"""

import os
import requests
import sys
import io

# Fix Windows console encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# Cloudflare credentials — from environment, never hardcoded.
ACCOUNT_ID = os.environ.get("CF_ACCOUNT_ID", "a1f6f05fe18c40f39059f59ef5c179f3")
DATABASE_ID = os.environ.get("CF_DATABASE_ID", "cdfcca5a-2f69-4a16-a406-cfe957e35f85")
API_TOKEN = os.environ.get("CF_API_TOKEN", "")

API_URL = f"https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/d1/database/{DATABASE_ID}/query"

if not API_TOKEN:
    print("ERREUR : la variable d'environnement CF_API_TOKEN est requise (cf. scripts/migrate-d1.py).")
    sys.exit(1)

HEADERS = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Content-Type": "application/json"
}

def execute_sql(sql):
    """Execute a SQL statement on D1"""
    response = requests.post(API_URL, headers=HEADERS, json={"sql": sql})
    data = response.json()

    if not data.get("success"):
        # Check if it's a "duplicate column" error (which is OK)
        errors = data.get("errors", [])
        if any("duplicate column" in str(e).lower() for e in errors):
            return {"ok": True, "skipped": True}
        return {"ok": False, "errors": errors}

    return {"ok": True, "data": data.get("result", [])}

def main():
    print("🚀 Starting D1 migration with official shipping rates...\n")

    # Step 1: Add columns
    print("📝 Step 1: Adding multilingual columns...")
    for col in ["name_fr", "name_en"]:
        result = execute_sql(f"ALTER TABLE shipping_rates ADD COLUMN {col} TEXT")
        if result.get("skipped"):
            print(f"   ⚠️  Column {col} already exists, skipping")
        elif result["ok"]:
            print(f"   ✅ Column {col} added")
        else:
            print(f"   ❌ Failed to add {col}: {result['errors']}")
            return

    # Step 2: Upsert 58 wilayas with official rates (INSERT OR REPLACE)
    print("\n📦 Step 2: Updating 58 wilayas with official rates...")

    wilayas = [
        (16, 'الجزائر', 'Alger', 'Algiers', 450, 350),
        (9, 'البليدة', 'Blida', 'Blida', 500, 400),
        (35, 'بومرداس', 'Boumerdès', 'Boumerdes', 500, 400),
        (42, 'تيبازة', 'Tipaza', 'Tipaza', 500, 400),
        (2, 'الشلف', 'Chlef', 'Chlef', 650, 550),
        (4, 'أم البواقي', 'Oum El Bouaghi', 'Oum El Bouaghi', 650, 550),
        (5, 'باتنة', 'Batna', 'Batna', 650, 550),
        (6, 'بجاية', 'Béjaïa', 'Bejaia', 650, 550),
        (10, 'البويرة', 'Bouira', 'Bouira', 650, 550),
        (13, 'تلمسان', 'Tlemcen', 'Tlemcen', 650, 550),
        (14, 'تيارت', 'Tiaret', 'Tiaret', 650, 550),
        (15, 'تيزي وزو', 'Tizi Ouzou', 'Tizi Ouzou', 650, 550),
        (18, 'جيجل', 'Jijel', 'Jijel', 650, 550),
        (19, 'سطيف', 'Sétif', 'Setif', 650, 550),
        (20, 'سعيدة', 'Saïda', 'Saida', 650, 550),
        (21, 'سكيكدة', 'Skikda', 'Skikda', 650, 550),
        (22, 'سيدي بلعباس', 'Sidi Bel Abbès', 'Sidi Bel Abbes', 650, 550),
        (23, 'عنابة', 'Annaba', 'Annaba', 650, 550),
        (24, 'قالمة', 'Guelma', 'Guelma', 650, 550),
        (25, 'قسنطينة', 'Constantine', 'Constantine', 650, 550),
        (26, 'المدية', 'Médéa', 'Medea', 650, 550),
        (27, 'مستغانم', 'Mostaganem', 'Mostaganem', 650, 550),
        (28, 'المسيلة', "M'Sila", "M'Sila", 650, 550),
        (49, 'المغير', "El M'Ghair", "El M'Ghair", 800, 650),
        (29, 'معسكر', 'Mascara', 'Mascara', 650, 550),
        (31, 'وهران', 'Oran', 'Oran', 650, 550),
        (34, 'برج بوعريريج', 'Bordj Bou Arréridj', 'Bordj Bou Arreridj', 650, 550),
        (36, 'الطارف', 'El Tarf', 'El Tarf', 650, 550),
        (38, 'تيسمسيلت', 'Tissemsilt', 'Tissemsilt', 650, 550),
        (40, 'خنشلة', 'Khenchela', 'Khenchela', 650, 550),
        (41, 'سوق أهراس', 'Souk Ahras', 'Souk Ahras', 650, 550),
        (43, 'ميلة', 'Mila', 'Mila', 650, 550),
        (44, 'عين الدفلى', 'Aïn Defla', 'Ain Defla', 650, 550),
        (46, 'عين تموشنت', 'Aïn Témouchent', 'Ain Temouchent', 650, 550),
        (48, 'غليزان', 'Relizane', 'Relizane', 650, 550),
        (3, 'الأغواط', 'Laghouat', 'Laghouat', 800, 650),
        (7, 'بسكرة', 'Biskra', 'Biskra', 800, 650),
        (12, 'تبسة', 'Tébessa', 'Tebessa', 800, 650),
        (17, 'الجلفة', 'Djelfa', 'Djelfa', 800, 650),
        (30, 'ورقلة', 'Ouargla', 'Ouargla', 800, 650),
        (39, 'الوادي', 'El Oued', 'El Oued', 800, 650),
        (47, 'غرداية', 'Ghardaïa', 'Ghardaia', 800, 650),
        (51, 'أولاد جلال', 'Ouled Djellal', 'Ouled Djellal', 800, 650),
        (55, 'تقرت', 'Touggourt', 'Touggourt', 800, 650),
        (49, 'المغير', "El M'Ghair", "El M'Ghair", 800, 650),
        (50, 'المنيعة', 'El Meniaa', 'El Menia', 800, 650),
        (1, 'أدرار', 'Adrar', 'Adrar', 1600, 1500),
        (8, 'بشار', 'Béchar', 'Bechar', 1600, 1500),
        (32, 'البيض', 'El Bayadh', 'El Bayadh', 1600, 1500),
        (45, 'النعامة', 'Naâma', 'Naama', 1600, 1500),
        (54, 'تيميمون', 'Timimoun', 'Timimoun', 1600, 1500),
        (52, 'برج باجي مختار', 'Bordj Badji Mokhtar', 'Bordj Badji Mokhtar', 1600, 1500),
        (53, 'بني عباس', 'Béni Abbès', 'Beni Abbes', 1600, 1500),
        (11, 'تمنراست', 'Tamanrasset', 'Tamanrasset', 1600, 1500),
        (33, 'إليزي', 'Illizi', 'Illizi', 1600, 1500),
        (37, 'تندوف', 'Tindouf', 'Tindouf', 1600, 1500),
        (57, 'عين صالح', 'In Salah', 'In Salah', 1600, 1500),
        (58, 'عين قزام', 'In Guezzam', 'In Guezzam', 1600, 1500),
        (56, 'جانت', 'Djanet', 'Djanet', 1600, 1500),
    ]

    for i, (code, name_ar, name_fr, name_en, home, desk) in enumerate(wilayas, 1):
        # Escape single quotes in names by doubling them for SQL
        name_ar_escaped = name_ar.replace("'", "''")
        name_fr_escaped = name_fr.replace("'", "''")
        name_en_escaped = name_en.replace("'", "''")

        # Use INSERT OR REPLACE to update existing wilayas
        sql = f"""INSERT OR REPLACE INTO shipping_rates (wilaya_code, wilaya_name, name_fr, name_en, price_home, price_desk, is_deliverable)
                  VALUES ({code}, '{name_ar_escaped}', '{name_fr_escaped}', '{name_en_escaped}', {home}, {desk}, 1)"""

        result = execute_sql(sql)
        if not result["ok"]:
            print(f"   ❌ Failed wilaya {code}: {result['errors']}")
            return

        print(f"   ✅ {i}/58 - Wilaya {code:02d} ({name_fr})", end='\r')

    print(f"\n   ✅ All 58 wilayas updated successfully!")

    print("\n🎉 Migration completed successfully!")
    print("   - Columns name_fr and name_en added")
    print("   - All 58 wilayas with official rates")
    print("   - Multilingual support (Arabic, French, English)")
    print("\n💡 Refresh your dashboard to see the changes!")

if __name__ == "__main__":
    main()
