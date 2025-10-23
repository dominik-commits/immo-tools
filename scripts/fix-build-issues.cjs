// scripts/fix-build-issues.cjs
// Quick-fix für Encoding-/PlanGuard-Artefakte in ein paar betroffenen Dateien.

const fs = require("fs");
const path = require("path");

const files = [
  "src/components/ThemePreview.tsx",
  "src/routes/Checkout.tsx",
  "src/routes/Compare.tsx",
];

function patch(file, replacers) {
  if (!fs.existsSync(file)) return { file, changed: false, msg: "skip (not found)" };
  const before = fs.readFileSync(file, "utf8");
  let after = before;
  replacers.forEach(([pattern, repl]) => {
    after = after.replace(pattern, repl);
  });
  const changed = after !== before;
  if (changed) fs.writeFileSync(file, after, "utf8");
  return { file, changed };
}

// Replacements
const patches = {
  "src/components/ThemePreview.tsx": [
    // kaputte Quotes wie ”ž … ”œ -> normale Anführungszeichen
    [/[”ž”œ]/g, `"`],
  ],

  "src/routes/Checkout.tsx": [
    // Entferne stray </PlanGuard>
    [/<\/PlanGuard>\s*/g, ""],
    // Entferne import PlanGuard, falls versehentlich in einem anderen import-Block gelandet
    [/^\s*import\s+PlanGuard\s+from\s+["']@\/components\/PlanGuard["'];?\s*$/gm, ""],
    // Falls es *mitten* in einem import { ... } Block steht (hartnäckiger Fall)
    [/\bimport\s+PlanGuard\s+from\s+["']@\/components\/PlanGuard["'];?/g, ""],
  ],

  "src/routes/Compare.tsx": [
    // Häufigster Build-Killer hier: einzelne </PlanGuard> an falscher Stelle
    [/<\/PlanGuard>\s*/g, ""],
    // (Optional) falls irgendwo ein nacktes <PlanGuard ...> ohne Schließen steht – lieber raus
    [/<PlanGuard[^>]*>\s*/g, ""],
    // Und überflüssige Importzeilen
    [/^\s*import\s+PlanGuard\s+from\s+["']@\/components\/PlanGuard["'];?\s*$/gm, (m) => m], // belasse den *top-level* Import
    // aber lösche fälschlich *eingeschobene* Varianten im Codefluss
    [/\bimport\s+PlanGuard\s+from\s+["']@\/components\/PlanGuard["'];?/g, ""],
  ],
};

let totalChanged = 0;
for (const f of files) {
  const res = patch(f, patches[f]);
  if (res.changed) totalChanged++;
  console.log(`${res.changed ? "✦" : "•"} ${res.file} ${res.changed ? "(patched)" : "(ok)"}`);
}

console.log(`\nDone. ${totalChanged} file(s) changed.`);
