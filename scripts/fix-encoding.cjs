#!/usr/bin/env node
/* fix-encoding.js
   Sucht & ersetzt gängige UTF-8-Mojibake in Quelltexten.
   Nutzung:
     node scripts/fix-encoding.js        # echte Änderungen + .bak
     node scripts/fix-encoding.js --dry  # nur anzeigen, nichts schreiben
*/

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");

const DRY = process.argv.includes("--dry");
const ROOT = process.cwd();
const START_DIR = path.join(ROOT, "src"); // ggf. anpassen

// Welche Dateien bearbeiten?
const EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

// Häufige Mojibake-Patterns → Ziel
// (Reihenfolge ist wichtig: von spezifisch → allgemein)
const REPLACEMENTS = [
  // Deutsche Umlaute / ß (UTF-8 -> Latin-1 falsch gelesen)
  [/Ã¼/g, "ü"],
  [/Ã¶/g, "ö"],
  [/Ã¤/g, "ä"],
  [/Ãœ/g, "Ü"],
  [/Ã–/g, "Ö"],
  [/Ã„/g, "Ä"],
  [/ÃŸ/g, "ß"],

  // Typografische Anführungszeichen -> ASCII "
  [/â€ž/g, "„"],  // deutsches öffnendes unten
  [/â€œ/g, "“"],  // “
  [/â€¢/g, "•"],  // bullet
  [/â€¹/g, "‹"],
  [/â€º/g, "›"],
  [/â€˜/g, "‘"],
  [/â€™/g, "’"],
  [/â€"/g, "”"],
  [/â€?/g, "”"],   // gelegentliches Zerwürfnis
  [/”ž/g, "“"],    // aus deinem Code-Beispiel
  [/”œ/g, "”"],    // aus deinem Code-Beispiel
  // Optional: alles „typografische“ in ASCII wandeln
  [/„|“|”|“/g, '"'],
  [/‘|’/g, "'"],

  // Gedankenstriche/Bindestriche
  [/â€“/g, "–"],   // en dash
  [/â€”/g, "—"],   // em dash

  // Sonstige häufige Artefakte
  [/Â /g, " "],    // hartnäckiges Â vor Leerzeichen
  [/Â/g, ""],      // verbleibendes Â entfernen
  [/â€¢/g, "•"],   // bullet
  [/â„¢/g, "™"],
  [/â€¦/g, "…"],

  // Aus deinem Snippet: falscher Bullet-Separator
  [/”¢/g, "·"],    // oder "/" – falls lieber Slash, hier "·" ersetzen
];

async function main() {
  const files = await walk(START_DIR);
  let totalChanged = 0;
  let totalFiles = 0;
  for (const file of files) {
    const before = await fsp.readFile(file, "utf8");
    let after = before;
    for (const [re, to] of REPLACEMENTS) after = after.replace(re, to);

    if (after !== before) {
      totalFiles++;
      const rel = path.relative(ROOT, file);
      const diffCount = countDiffs(before, after);
      totalChanged += diffCount;
      console.log(`✦ ${rel}  (+${diffCount} Ersetzungen)${DRY ? " [dry]" : ""}`);

      if (!DRY) {
        // Backup
        await fsp.writeFile(file + ".bak", before, "utf8");
        // Schreiben
        await fsp.writeFile(file, after, "utf8");
      }
    }
  }
  console.log(
    totalFiles
      ? `\nFertig: ${totalFiles} Datei(en) geändert, ${totalChanged} Ersetzungen.`
      : `\nKeine Änderungen nötig.`
  );
}

async function walk(dir) {
  const out = [];
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name === "node_modules" || e.name.startsWith(".") || e.name === "dist" || e.name === "build") continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await walk(full)));
    } else if (EXT.has(path.extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

function countDiffs(a, b) {
  // grobe Heuristik: gezählte Treffer aller REs auf 'a'
  let n = 0;
  for (const [re] of REPLACEMENTS) {
    const m = a.match(re);
    if (m) n += m.length;
  }
  return n;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
