#!/usr/bin/env node
// tools/fix-mojibake.mjs
// Repariert typische Mojibake/Encoding-Artefakte (UTF-8 ↔ Windows-1252)

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const apply = process.argv.includes("--apply");
const exts = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".html"];
const ignoreDirs = ["node_modules", ".git", "dist", ".vercel", ".next", "build", "out", "coverage", "tmp", "__backup_pre_codemod"];

// 1) breit abgedecktes Mapping
const map = new Map(Object.entries({
  // Umlaute
  "Ã¤":"ä","Ã„":"Ä","Ã¶":"ö","Ã–":"Ö","Ã¼":"ü","Ãœ":"Ü","ÃŸ":"ß","Ã¸":"ø","Ã˜":"Ø",
  // NBSP/Restbytes
  "Â ":" ","Â":"",
  // Anführungen/Striche/Ellipse
  "â€ž":"„","â€œ":"“","â€ť":"”","â€˜":"‚","â€™":"’","â€“":"–","â€”":"—","â€¦":"…",
  // Währung/Pfeile/sonstiges
  "â‚¬":"€","â†’":"→","â‡’":"⇒",
}));

// 2) generische kaputte Emoji-Sequenzen -> Bullet
const emojiMojibakeRegex1 = /ðŸ[\u0080-\u00BF]{1,6}/g; // "ðŸ..."
const emojiMojibakeRegex2 = /öŸ[\u0080-\u00BF]{1,6}/g; // seltener

function listFiles(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (ignoreDirs.includes(name)) continue;
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) out.push(...listFiles(fp));
    else if (exts.includes(path.extname(fp))) out.push(fp);
  }
  return out;
}

const files = listFiles(root);
let changed = 0;
const touched = [];

for (const file of files) {
  let src;
  try { src = fs.readFileSync(file, "utf8"); } catch { continue; }
  let out = src;

  for (const [bad, good] of map.entries()) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }
  out = out.replace(emojiMojibakeRegex1, "• ");
  out = out.replace(emojiMojibakeRegex2, "• ");

  if (out !== src) {
    changed++;
    touched.push(file);
    if (apply) fs.writeFileSync(file, out, { encoding: "utf8" });
  }
}

console.log(`📂 Dateien: ${files.length}`);
console.log(`${apply ? "✅ Geändert" : "🔎 Würde ändern"}: ${changed}`);
if (changed) {
  for (const f of touched) console.log("  •", f);
}
if (!apply) console.log("\nMit --apply wirklich schreiben:  node tools/fix-mojibake.mjs --apply");
