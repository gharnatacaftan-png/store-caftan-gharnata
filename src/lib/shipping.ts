import fs from "fs";
import path from "path";
import { WILAYAS } from "./wilayas";
import { ShippingRate } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "shipping.json");

function ensureFile(): void {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_PATH)) {
    // Initialize with default prices from wilayas.ts
    const defaults: ShippingRate[] = WILAYAS.map(w => ({
      code: w.code,
      name: w.name,
      nameAr: w.nameAr,
      domicile: w.domicile,
      bureau: w.bureau,
    }));
    fs.writeFileSync(DATA_PATH, JSON.stringify(defaults, null, 2));
  }
}

export function getAllRates(): ShippingRate[] {
  ensureFile();
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

export function getRateByCode(code: string): ShippingRate | undefined {
  return getAllRates().find(r => r.code === code);
}

export function updateRate(code: string, domicile: number, bureau: number): void {
  ensureFile();
  const rates = getAllRates();
  const idx = rates.findIndex(r => r.code === code);
  if (idx !== -1) {
    rates[idx].domicile = domicile;
    rates[idx].bureau = bureau;
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(rates, null, 2));
}

export function updateAllRates(updates: Array<{ code: string; domicile: number; bureau: number }>): void {
  ensureFile();
  const rates = getAllRates();
  for (const update of updates) {
    const idx = rates.findIndex(r => r.code === update.code);
    if (idx !== -1) {
      rates[idx].domicile = update.domicile;
      rates[idx].bureau = update.bureau;
    }
  }
  fs.writeFileSync(DATA_PATH, JSON.stringify(rates, null, 2));
}
