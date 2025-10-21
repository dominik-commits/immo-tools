#!/usr/bin/env node
// tools/fix-mojibake.mjs
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dry = process.argv.includes("--dry");

const exts = [".ts", ".tsx", ".js", ".jsx", ".json", ".md", ".css", ".html"];
const ignoreDirs = ["node_modules", ".git", "dist", ".vercel", ".next"];

const map = new Map(Object.entries({
  // Umlaute & Standard-Zeichen
  "Ã¤":"ä","Ã„":"Ä","Ã¶":"ö","Ã–":"Ö","Ã¼":"ü","Ãœ":"Ü","ÃŸ":"ß",
  "Ã¸":"ø","Ã˜":"Ø",
  "Â°":"°","Â²":"²","Â³":"³","Â ":" ","Â":"",
  "â€“":"–","â€”":"—","â€ž":"„","â€œ":"“","â€\u009D":"”","â€˜":"‚","â€™":"’",
  "â€¢":"•","â€¦":"…","â‚¬":"€","â‰ˆ":"≈","â‡’":"⇒","‰":"‰",
}));

// Optional: konkrete Emoji-Fälle, die wir schon gesehen haben
const emojiSpecific = new Map(Object.entries({
  "ðŸ“‰":"📝", // Notiz
  "ðŸ§®":"🧮", // Abakus
  // 🔧 wenn du weitere siehst, hier ergänzen…
}));
for (const [k,v] of emojiSpecific) map.set(k,v);

// Fallback: alle restlichen „ðŸ…“-Mojibake -> Bullet-Punkt
// typisches Muster: ð  (U+00F0)  Ÿ (U+009F)  <zwei bis vier weitere Bytes>
const emojiMojibakeRegex = /ðŸ[\u0080-\u00BF]{1,6}/g;

// Dateien sammeln
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
  let src = fs.readFileSync(file, "utf8");
  let out = src;

  // exakte Ersetzungen
  for (const [bad, good] of map.entries()) {
    if (out.includes(bad)) out = out.split(bad).join(good);
  }

  // generischer Emoji-Mojibake-Fix -> •
  out = out.replace(emojiMojibakeRegex, "• ");

  if (out !== src) {
    changed++;
    touched.push(file);
    if (!dry) {
      // UTF-8 *ohne* BOM schreiben
      fs.writeFileSync(file, out, { encoding: "utf8" });
    }
  }
}

console.log(`📂 Durchsuchte Dateien: ${files.length}`);
console.log(`✅ Geänderte Dateien: ${changed}`);
if (changed) {
  console.log((dry ? "👉 Folgende Dateien würden geändert:" : "👉 Geändert:"));
  for (const f of touched) console.log(f);
}
if (dry) {
  console.log("\nℹ️  Mit --apply wirklich schreiben:");
  console.log("   node tools/fix-mojibake.mjs --apply");
}
