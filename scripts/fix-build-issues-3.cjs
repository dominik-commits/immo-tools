// scripts/fix-build-issues-3.cjs
const fs = require("fs");
const path = require("path");

const files = [
  "src/components/ThemePreview.tsx",
  "src/routes/Checkout.tsx",
  "src/routes/Compare.tsx",
];

function read(p){ return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null; }
function write(p, s){ fs.writeFileSync(p, s, "utf8"); }

function patchThemePreview(s){
  let out = s;

  // 1) Hartnäckiges 'Š' entfernen (U+0160), das die Strings kaputt macht
  out = out.replace(/\u0160/g, "");

  // 2) Doppel-Quotes zusammenfalten, die durch (1) entstehen können:  "🧮""
  out = out.replace(/""+/g, '"');

  // 3) Icon-Zeilen absichern: falls nach icon: noch irgendwas Komisches steht
  //    (nur die 🧮-Zeile hart fangen)
  out = out.replace(/icon:\s*"🧮"[^,\}\]]*/g, 'icon: "🧮"');

  // 4) Typografische Quotes vereinheitlichen
  out = out.replace(/[“”„]/g, '"');

  // 5) Pfeil-Ersatz bereits vorhanden; nichts weiter tun

  return out;
}

function patchCheckout(s){
  let out = s;

  // 1) typografische Quotes -> normale
  out = out.replace(/[“”„]/g, '"');

  // 2) Falsches zusätzliches Quote vor Ellipse entfernen: "Starte Checkout "…"
  //    => "Starte Checkout …"
  out = out.replace(/Starte Checkout\s*"\u2026"/g, "Starte Checkout …");

  // 3) Notfalls alle Varianten mit extra-Quote + Ellipse reparieren
  out = out.replace(/"\s*\u2026"\s*/g, " … ");

  // 4) Überflüssige Doppel-Quotes zusammenfalten
  out = out.replace(/""+/g, '"');

  return out;
}

function patchCompare(s){
  let out = s;

  // Übrig gebliebene Artefakte: z. B. "the const"
  out = out.replace(/\bthe\s+const\b/g, "const");

  return out;
}

const patchers = {
  "src/components/ThemePreview.tsx": patchThemePreview,
  "src/routes/Checkout.tsx": patchCheckout,
  "src/routes/Compare.tsx": patchCompare,
};

let changed = 0;
for (const rel of files){
  const p = path.resolve(rel);
  const before = read(p);
  if (before == null){ console.log(`• skip (not found): ${rel}`); continue; }
  const after = patchers[rel](before);
  if (after !== before){
    write(p, after);
    console.log(`✦ patched: ${rel}`);
    changed++;
  }else{
    console.log(`• ok: ${rel}`);
  }
}
console.log(`\nDone. ${changed} file(s) changed.`);
