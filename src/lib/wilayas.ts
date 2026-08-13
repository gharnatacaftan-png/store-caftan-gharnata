// 58 wilayas d'Algérie — tarifs officiels de livraison (identiques à la table
// D1 shipping_rates : la migration scripts/migrate-shipping-rates.sql fait foi).
// Ce fichier ne sert que de secours côté client avant le chargement de
// /api/shipping-rates ; il doit donc rester synchronisé avec la base.
export interface Wilaya {
  code: string;
  name: string;      // Français
  nameEn: string;    // Anglais
  nameAr: string;    // Arabe
  domicile: number;  // Prix à domicile (DA)
  bureau: number;    // Prix stop desk (DA)
}

// Normalise un code wilaya en chaîne à 2 chiffres ("1" → "01", 16 → "16").
// D1 renvoie des codes numériques non paddés alors que WILAYAS utilise des
// codes à 2 chiffres : sans cette normalisation, les secours FR/EN échouent
// et l'UI affiche "Wilaya 1, 2, 3…".
export function normalizeWilayaCode(code: string | number | null | undefined): string {
  const n = Number(code);
  if (!Number.isFinite(n) || n <= 0) return "";
  return String(n).padStart(2, "0");
}

export const WILAYAS: Wilaya[] = [
  { code: "01", name: "Adrar",              nameEn: "Adrar",                nameAr: "أدرار",             domicile: 1600, bureau: 1500 },
  { code: "02", name: "Chlef",              nameEn: "Chlef",                nameAr: "الشلف",             domicile: 650,  bureau: 550 },
  { code: "03", name: "Laghouat",           nameEn: "Laghouat",             nameAr: "الأغواط",           domicile: 800,  bureau: 650 },
  { code: "04", name: "Oum El Bouaghi",     nameEn: "Oum El Bouaghi",       nameAr: "أم البواقي",        domicile: 650,  bureau: 550 },
  { code: "05", name: "Batna",              nameEn: "Batna",                nameAr: "باتنة",             domicile: 650,  bureau: 550 },
  { code: "06", name: "Béjaïa",             nameEn: "Bejaia",               nameAr: "بجاية",             domicile: 650,  bureau: 550 },
  { code: "07", name: "Biskra",             nameEn: "Biskra",               nameAr: "بسكرة",             domicile: 800,  bureau: 650 },
  { code: "08", name: "Béchar",             nameEn: "Bechar",               nameAr: "بشار",              domicile: 1600, bureau: 1500 },
  { code: "09", name: "Blida",              nameEn: "Blida",                nameAr: "البليدة",           domicile: 500,  bureau: 400 },
  { code: "10", name: "Bouira",             nameEn: "Bouira",               nameAr: "البويرة",           domicile: 650,  bureau: 550 },
  { code: "11", name: "Tamanrasset",        nameEn: "Tamanrasset",          nameAr: "تمنراست",           domicile: 1600, bureau: 1500 },
  { code: "12", name: "Tébessa",            nameEn: "Tebessa",              nameAr: "تبسة",              domicile: 800,  bureau: 650 },
  { code: "13", name: "Tlemcen",            nameEn: "Tlemcen",              nameAr: "تلمسان",            domicile: 650,  bureau: 550 },
  { code: "14", name: "Tiaret",             nameEn: "Tiaret",               nameAr: "تيارت",             domicile: 650,  bureau: 550 },
  { code: "15", name: "Tizi Ouzou",         nameEn: "Tizi Ouzou",           nameAr: "تيزي وزو",          domicile: 650,  bureau: 550 },
  { code: "16", name: "Alger",              nameEn: "Algiers",              nameAr: "الجزائر",           domicile: 450,  bureau: 350 },
  { code: "17", name: "Djelfa",             nameEn: "Djelfa",               nameAr: "الجلفة",            domicile: 800,  bureau: 650 },
  { code: "18", name: "Jijel",              nameEn: "Jijel",                nameAr: "جيجل",              domicile: 650,  bureau: 550 },
  { code: "19", name: "Sétif",              nameEn: "Setif",                nameAr: "سطيف",              domicile: 650,  bureau: 550 },
  { code: "20", name: "Saïda",              nameEn: "Saida",                nameAr: "سعيدة",             domicile: 650,  bureau: 550 },
  { code: "21", name: "Skikda",             nameEn: "Skikda",               nameAr: "سكيكدة",            domicile: 650,  bureau: 550 },
  { code: "22", name: "Sidi Bel Abbès",     nameEn: "Sidi Bel Abbes",       nameAr: "سيدي بلعباس",       domicile: 650,  bureau: 550 },
  { code: "23", name: "Annaba",             nameEn: "Annaba",               nameAr: "عنابة",             domicile: 650,  bureau: 550 },
  { code: "24", name: "Guelma",             nameEn: "Guelma",               nameAr: "قالمة",             domicile: 650,  bureau: 550 },
  { code: "25", name: "Constantine",        nameEn: "Constantine",          nameAr: "قسنطينة",           domicile: 650,  bureau: 550 },
  { code: "26", name: "Médéa",              nameEn: "Medea",                nameAr: "المدية",            domicile: 650,  bureau: 550 },
  { code: "27", name: "Mostaganem",         nameEn: "Mostaganem",           nameAr: "مستغانم",           domicile: 650,  bureau: 550 },
  { code: "28", name: "M'Sila",             nameEn: "M'Sila",               nameAr: "المسيلة",           domicile: 650,  bureau: 550 },
  { code: "29", name: "Mascara",            nameEn: "Mascara",              nameAr: "معسكر",             domicile: 650,  bureau: 550 },
  { code: "30", name: "Ouargla",            nameEn: "Ouargla",              nameAr: "ورقلة",             domicile: 800,  bureau: 650 },
  { code: "31", name: "Oran",               nameEn: "Oran",                 nameAr: "وهران",             domicile: 650,  bureau: 550 },
  { code: "32", name: "El Bayadh",          nameEn: "El Bayadh",            nameAr: "البيض",             domicile: 1600, bureau: 1500 },
  { code: "33", name: "Illizi",             nameEn: "Illizi",               nameAr: "إليزي",             domicile: 1600, bureau: 1500 },
  { code: "34", name: "Bordj Bou Arréridj", nameEn: "Bordj Bou Arreridj",   nameAr: "برج بوعريريج",      domicile: 650,  bureau: 550 },
  { code: "35", name: "Boumerdès",          nameEn: "Boumerdes",            nameAr: "بومرداس",           domicile: 500,  bureau: 400 },
  { code: "36", name: "El Tarf",            nameEn: "El Tarf",              nameAr: "الطارف",            domicile: 650,  bureau: 550 },
  { code: "37", name: "Tindouf",            nameEn: "Tindouf",              nameAr: "تندوف",             domicile: 1600, bureau: 1500 },
  { code: "38", name: "Tissemsilt",         nameEn: "Tissemsilt",           nameAr: "تيسمسيلت",          domicile: 650,  bureau: 550 },
  { code: "39", name: "El Oued",            nameEn: "El Oued",              nameAr: "الوادي",            domicile: 800,  bureau: 650 },
  { code: "40", name: "Khenchela",          nameEn: "Khenchela",            nameAr: "خنشلة",             domicile: 650,  bureau: 550 },
  { code: "41", name: "Souk Ahras",         nameEn: "Souk Ahras",           nameAr: "سوق أهراس",         domicile: 650,  bureau: 550 },
  { code: "42", name: "Tipaza",             nameEn: "Tipaza",               nameAr: "تيبازة",            domicile: 500,  bureau: 400 },
  { code: "43", name: "Mila",               nameEn: "Mila",                 nameAr: "ميلة",              domicile: 650,  bureau: 550 },
  { code: "44", name: "Aïn Defla",          nameEn: "Ain Defla",            nameAr: "عين الدفلى",        domicile: 650,  bureau: 550 },
  { code: "45", name: "Naâma",              nameEn: "Naama",                nameAr: "النعامة",           domicile: 1600, bureau: 1500 },
  { code: "46", name: "Aïn Témouchent",     nameEn: "Ain Temouchent",       nameAr: "عين تموشنت",        domicile: 650,  bureau: 550 },
  { code: "47", name: "Ghardaïa",           nameEn: "Ghardaia",             nameAr: "غرداية",            domicile: 800,  bureau: 650 },
  { code: "48", name: "Relizane",           nameEn: "Relizane",             nameAr: "غليزان",            domicile: 650,  bureau: 550 },
  { code: "49", name: "El M'Ghair",         nameEn: "El M'Ghair",           nameAr: "المغير",            domicile: 800,  bureau: 650 },
  { code: "50", name: "El Meniaa",          nameEn: "El Menia",             nameAr: "المنيعة",           domicile: 800,  bureau: 650 },
  { code: "51", name: "Ouled Djellal",      nameEn: "Ouled Djellal",        nameAr: "أولاد جلال",        domicile: 800,  bureau: 650 },
  { code: "52", name: "Bordj Badji Mokhtar",nameEn: "Bordj Badji Mokhtar",  nameAr: "برج باجي مختار",    domicile: 1600, bureau: 1500 },
  { code: "53", name: "Béni Abbès",         nameEn: "Beni Abbes",           nameAr: "بني عباس",          domicile: 1600, bureau: 1500 },
  { code: "54", name: "Timimoun",           nameEn: "Timimoun",             nameAr: "تيميمون",           domicile: 1600, bureau: 1500 },
  { code: "55", name: "Touggourt",          nameEn: "Touggourt",            nameAr: "تقرت",              domicile: 800,  bureau: 650 },
  { code: "56", name: "Djanet",             nameEn: "Djanet",               nameAr: "جانت",              domicile: 1600, bureau: 1500 },
  { code: "57", name: "In Salah",           nameEn: "In Salah",             nameAr: "عين صالح",          domicile: 1600, bureau: 1500 },
  { code: "58", name: "In Guezzam",         nameEn: "In Guezzam",           nameAr: "عين قزام",          domicile: 1600, bureau: 1500 },
];

export function getWilayaByCode(code: string): Wilaya | undefined {
  return WILAYAS.find(w => w.code === normalizeWilayaCode(code));
}
