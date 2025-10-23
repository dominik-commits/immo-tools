/* Patch MFHCheck.tsx: gesamtFlaecheM2 -> (.. ?? flaecheM2) + fehlendes flaecheM2 in baseInput */
const fs = require("fs");
const path = require("path");

const file = path.join("src", "routes", "MFHCheck.tsx");
let s = fs.readFileSync(file, "utf8");
let changed = false;

// 1) Stellen, an denen direkt mit gesamtFlaecheM2 gerechnet wird -> Fallback
const reps = [
  // gross = base.gesamtFlaecheM2 * base.mieteProM2Monat * 12;
  [
    /base\.gesamtFlaecheM2\s*\*\s*base\.mieteProM2Monat\s*\*\s*12/g,
    "(base.gesamtFlaecheM2 ?? base.flaecheM2) * base.mieteProM2Monat * 12",
  ],
  // gross = base.gesamtFlaecheM2 * rent * 12;
  [
    /base\.gesamtFlaecheM2\s*\*\s*rent\s*\*\s*12/g,
    "(base.gesamtFlaecheM2 ?? base.flaecheM2) * rent * 12",
  ],
  // opex = (base.gesamtFlaecheM2 * base.mieteProM2Monat * 12) * base.opexPctBrutto
  [
    /\(base\.gesamtFlaecheM2\s*\*\s*base\.mieteProM2Monat\s*\*\s*12\)\s*\*\s*base\.opexPctBrutto/g,
    "((base.gesamtFlaecheM2 ?? base.flaecheM2) * base.mieteProM2Monat * 12) * base.opexPctBrutto",
  ],
  // viewIn.gesamtFlaecheM2 * viewIn.mieteProM2Monat * 12
  [
    /viewIn\.gesamtFlaecheM2\s*\*\s*viewIn\.mieteProM2Monat\s*\*\s*12/g,
    "(viewIn.gesamtFlaecheM2 ?? viewIn.flaecheM2) * viewIn.mieteProM2Monat * 12",
  ],
];

for (const [re, to] of reps) {
  const before = s;
  s = s.replace(re, to);
  if (s !== before) changed = true;
}

// 2) baseInput-Objekt: fehlendes flaecheM2 ergänzen
// Wir suchen eine Zeile "gesamtFlaecheM2:" innerhalb des baseInput-Objekts
s = s.replace(
  /(const\s+baseInput\s*:\s*MfhInput\s*=\s*\{\s*[\s\S]*?gesamtFlaecheM2\s*:\s*([a-zA-Z0-9_]+)\s*,)/m,
  (m, whole, varName) => {
    changed = true;
    // direkt danach flaecheM2 setzen
    return m + `\n    flaecheM2: ${varName},`;
  }
);

if (changed) {
  fs.writeFileSync(file, s, "utf8");
  console.log("✦ patched:", file);
} else {
  console.log("• ok:", file);
}
