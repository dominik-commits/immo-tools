// scripts/fix-build-issues-5.cjs
const fs = require("fs");
const path = require("path");

function patchBasicToBasis(file) {
  const p = path.resolve(file);
  if (!fs.existsSync(p)) return false;
  let txt = fs.readFileSync(p, "utf8");
  const before = txt;
  // nur echte Props treffen: required="basic"
  txt = txt.replace(/required\s*=\s*"basic"/g, 'required="basis"');
  if (txt !== before) {
    fs.writeFileSync(p, txt, "utf8");
    console.log(`✦ patched: ${file}`);
    return true;
  } else {
    console.log(`• ok: ${file}`);
    return false;
  }
}

// 1) PlanGuard-Fixer
const files = [
  "src/routes/Eigentumswohnung.tsx",
  "src/routes/FinanzierungSimple.tsx",
  "src/routes/MFHCheck.tsx",
  "src/routes/Mietkalkulation.tsx",
  "src/routes/Mietkalkulator.tsx",
];

let changed = 0;
for (const f of files) changed += patchBasicToBasis(f) ? 1 : 0;

// 2) core/calcs Shim bereitstellen (nur falls fehlt oder leer)
const coreDir = path.resolve("src/core");
if (!fs.existsSync(coreDir)) fs.mkdirSync(coreDir, { recursive: true });

const calcsPath = path.resolve("src/core/calcs.ts");
if (!fs.existsSync(calcsPath)) {
  const shim = `// auto-generated shim: src/core/calcs.ts
export type MfhInput = {
  kaufpreis: number;
  einheiten?: { flaeche: number; mieteKalt: number; vacancyPct?: number }[];
  opexPctBrutto?: number;      // 0..1, auf Bruttomiete
  capRateAssumed?: number;     // 0..1
  financingOn?: boolean;
  ltvPct?: number;
  zinsPct?: number;            // 0..1 p.a.
  tilgungPct?: number;         // 0..1 p.a.
};

export type MfhOutput = {
  grossRentYear: number;
  effRentYear: number;
  opexYear: number;
  noiYear: number;
  noiYield: number;
  dscr: number | null;
  cashflowMonat: number;
  wertAusCap: number;
  valueGap?: number;
};

export function eur(n: number) {
  return Number.isFinite(n)
    ? n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 })
    : "–";
}
export function pct(x: number) {
  return Number.isFinite(x) ? (x * 100).toFixed(1) + " %" : "–";
}
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }

export function calcMfh(input: MfhInput): MfhOutput {
  const units = input.einheiten ?? [];
  // Bruttojahresmiete = Summe (flache * miete * 12)
  const gross = units.reduce((s, u) => s + (u.flaeche || 0) * (u.mieteKalt || 0) * 12, 0);
  const vacancy = units.reduce((s, u) => s + ((u.flaeche || 0) * (u.mieteKalt || 0) * 12) * clamp01(u.vacancyPct ?? 0), 0);
  const eff = gross - vacancy;

  const opexPct = clamp01(input.opexPctBrutto ?? 0.2);
  const opex = gross * opexPct;

  const noi = eff - opex;
  const kp = Math.max(0, input.kaufpreis || 0);
  const noiYield = kp > 0 ? noi / kp : 0;

  // Finanzierung (vereinfachtes Annuitäts-Modell)
  const on = !!input.financingOn;
  const L = on ? kp * clamp01(input.ltvPct ?? 0.8) : 0;
  const z = clamp01(input.zinsPct ?? 0.04);
  const t = clamp01(input.tilgungPct ?? 0.02);
  const annYear = on ? L * (z + t) : 0;
  const dscr = on && annYear > 0 ? noi / annYear : null;
  const cfMonat = (noi - annYear) / 12;

  const cap = Math.max(0.0001, input.capRateAssumed ?? 0.055);
  const wert = noi / cap;

  return {
    grossRentYear: Math.round(gross),
    effRentYear: Math.round(eff),
    opexYear: Math.round(opex),
    noiYear: Math.round(noi),
    noiYield,
    dscr: dscr ? Number(dscr.toFixed(2)) : null,
    cashflowMonat: Math.round(cfMonat),
    wertAusCap: Math.round(wert),
  };
}
`;
  fs.writeFileSync(calcsPath, shim, "utf8");
  console.log(`✦ created: src/core/calcs.ts`);
} else {
  console.log("• ok: src/core/calcs.ts (exists)");
}

console.log(`\nDone. ${changed} file(s) patched.`);
`;
  fs.writeFileSync(calcsPath, shim, "utf8");
  console.log(\`✦ created: src/core/calcs.ts\`);
} else {
  console.log("• ok: src/core/calcs.ts (exists)");
}

console.log(\`\\nDone. \${changed} file(s) patched.\`);
