// fix-mojibake.mjs
// --------------------------------------------
// Verwendung:
//   node fix-mojibake.mjs         → ersetzt direkt in allen Dateien
//   node fix-mojibake.mjs --dry   → nur Vorschau (keine Änderungen)
//
// Zweck:
// - Durchsucht dein Projekt rekursiv (Unterordner)
// - Überspringt node_modules, .git usw.
// - Korrigiert häufige falsche Sonderzeichen (UTF-8 / Mojibake)
// - Speichert alles in UTF-8 ohne BOM

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = process.cwd();

const DRY = process.argv.includes("--dry");

// Ordner, die übersprungen werden sollen
const SKIP_DIRS = new Set([
  "node_modules", ".git", ".next", "dist", "build", "out", ".vercel", ".cache"
]);

// Dateitypen, die durchsucht werden
const EXT = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".html"
]);

// Zu ersetzende falsche Zeichen → richtige Zeichen
const REPLACE = new Map(Object.entries({
  "Ã¤":"ä","Ã„":"Ä","Ã¶":"ö","Ã–":"Ö","Ã¼":"ü","Ãœ":"Ü","ÃŸ":"ß",
  "Ã¸":"ø","Ã˜":"Ø",
  "Â°":"°","Â²":"²","Â³":"³","Â ":" ","Â":"",
  "Ã—":"×",
  "â€“":"–","â€”":"—","â€ž":"„","â€œ":"“","â€":"”","â€˜":"‚","â€™":"’",
  "â€¢":"•","â€¦":"…","â‚¬":"€","â‰ˆ":"≈","â‡’":"⇒","âˆ’":"−",
  "â€°":"‰","‰":"‰",
  "ˆ":"","˜":"~","‰¥":"≥","‰¤":"≤",
  "ðŸ“‰":"📝","ðŸ§®":"🧮"
}));

// --------------------------------------------
// Hilfsfunktionen
// --------------------------------------------
async function* walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const ent of entries) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) yield* walk(p);
    } else {
      const ext = path.extname(ent.name);
      if (EXT.has(ext)) yield p;
    }
  }
}

function stripBOM(s) {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1) : s;
}

function fixText(s) {
  let out = stripBOM(s);
  for (const [bad, good] of REPLACE.entries()) {
    out = out.replace(new RegExp(bad.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&"), "g"), good);
  }
  return out;
}

// --------------------------------------------
// Hauptfunktion
// --------------------------------------------
async function main() {
  let scanned = 0, changed = 0;
  const touched = [];

  for await (const file of walk(ROOT)) {
    scanned++;
    const orig = await fs.readFile(file, "utf8");
    const fixed = fixText(orig);
    if (fixed !== orig) {
      changed++;
      touched.push(file);
      if (!DRY) await fs.writeFile(file, fixed, { encoding: "utf8" });
    }
  }

  console.log(`📂 Durchsuchte Dateien: ${scanned}`);
  console.log(`✅ Geänderte Dateien: ${changed}`);
  if (touched.length) {
    console.log(DRY ? "👉 Folgende Dateien würden geändert:" : "👉 Folgende Dateien wurden geändert:");
    console.log(touched.join("\n"));
  } else {
    console.log("Alles sauber – keine fehlerhaften Zeichen gefunden 🎉");
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
