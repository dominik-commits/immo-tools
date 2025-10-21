#!/usr/bin/env node
// tools/fix-mojibake.mjs
//
// Zweck: Repariert typische Mojibake/Encoding-Artefakte (UTF-8 → Windows-1252),
// inkl. kaputter Emoji-Sequenzen (z. B. „ðŸ…“) und einzelner Reste (z. B. „Â “).
//
// Nutzung:
//   node tools/fix-mojibake.mjs --dry     # zeigt nur an, was geändert würde (Standard)
//   node tools/fix-mojibake.mjs --apply   # schreibt die Änderungen in die Dateien

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const dry = !apply;

const exts = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".html"];
const ignoreDirs = ["node_modules", ".git", "dist", ".vercel", ".next", "build", "out"];

// 1) Direkte 1:1-Mappings (klassische Mojibake-Fälle)
const map = new Map(
  Object.entries({
    // Umlaute & typische Zeichen
    "Ã¤": "ä",
    "Ã„": "Ä",
    "Ã¶": "ö",
    "Ã–": "Ö",
    "Ã¼": "ü",
    "Ãœ": "Ü",
    "ÃŸ": "ß",
    "Ã¸": "ø",
    "Ã˜": "Ø",

    // Grad/hochgestellte Zahlen etc.
    "Â°": "°",
    "Â²": "²",
    "Â³": "³",

    // Häufige „harte“ Spaces/Restbytes
    "Â ": " ",
    "Â": "",

    // Gedankenstriche/Anführungen usw.
    "â€“": "–",
    "â€”": "—",
    "â€ž": "„",
    "â€œ": "“",
    "â€\u009D": "”",
    "â€˜": "‚",
    "â€™": "’",

    // Punkte, Ellipsen, Euro etc.
    "â€¢": "•",
    "â€¦": "…",
    "â‚¬": "€",
    "â‰ˆ": "≈",
    "â‡’": "⇒",

    // Promille/Sonderfälle
    "‰": "‰",
    "‰¥": "≥",
    "‰¤": "≤",

    // Weitere Rest-Artefakte, die oft alleine auftauchen
    "Ã ": "",   // einzelnes „Ã “
    "Ã‚": "",   // einzelnes „Ã‚“
  })
);

// 2) Konkrete Emoji-Fälle (falls du echte Emojis willst, hier ergänzen)
const emojiSpecific = new Map(
  Object.entries({
    "ðŸ“‰": "📝", // Notiz
    "ðŸ§®": "🧮", // Abakus
  })
);
for (const [k, v] of emojiSpecific) map.set(k, v);

// 3) Generische kaputte Emoji-Sequenzen → als Fallback zu Bullet "• "
// Typisch: "ðŸ" + 1..6 Folgebits (kaputte UTF-8-Bytes)
// Selten: "öŸ" statt "ðŸ" (gleicher Ursprung)
const emojiMojibakeRegex1 = /ðŸ[\u0080-\u00BF]{1,6}/g;
const emojiMojibakeRegex2 = /öŸ[\u0080-\u00BF]{1,6}/g;

// Dateien rekursiv einsammeln
function listFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (ignoreDirs.includes(name)) continue;
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) {
      out.push(...listFiles(fp));
    } else if (exts.includes(path.extname(fp))) {
      out.push(fp);
    }
  }
  return out;
}

const files = listFiles(root);
let changed = 0;
const touched = [];

for (const file of files) {
  let src;
  try {
    src = fs.readFileSync(file, "utf8");
  } catch {
    // Falls die Datei nicht als UTF-8 lesbar ist, einfach überspringen
    continue;
  }

  let out = src;

  // 1: exakte Ersetzungen anwenden
  for (const [bad, good] of map.entries()) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }

  // 2: generische Emoji-Mojibake-Fälle -> Bullet
  out = out.replace(emojiMojibakeRegex1, "• ");
  out = out.replace(emojiMojibakeRegex2, "• ");

  if (out !== src) {
    changed++;
    touched.push(file);
    if (!dry) {
      // UTF-8 ohne BOM schreiben
      fs.writeFileSync(file, out, { encoding: "utf8" });
    }
  }
}

// Ausgabe
console.log(`📂 Durchsuchte Dateien: ${files.length}`);
console.log(`✅ Geänderte Dateien: ${changed}`);
if (changed) {
  console.log(dry ? "👉 Folgende Dateien würden geändert:" : "👉 Geändert:");
  for (const f of touched) console.log(f);
}
if (dry) {
  console.log("\nℹ️  Mit --apply wirklich schreiben:");
  console.log("   node tools/fix-mojibake.mjs --apply");
}
