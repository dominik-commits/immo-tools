// scripts/fix-build-issues-2.cjs
const fs = require("fs");
const path = require("path");

const targets = [
  "src/components/ThemePreview.tsx",
  "src/routes/Checkout.tsx",
  "src/routes/Compare.tsx",
];

function patchThemePreview(s) {
  let out = s;

  // kaputtes Emoji/Quote bei icon: "ðŸ"Š"
  out = out.replace(/icon:\s*"ð[^"]*"/g, 'icon: "🧮"');

  // Pfeile: †' oder †’ -> →
  out = out.replace(/†[’']/g, "→");

  // gelegentlich kaputte typografische Quotes in dem File
  out = out.replace(/[“”]/g, '"');

  return out;
}

function patchCheckout(s) {
  let out = s;

  // kaputtes Zeichen ¦ -> Ellipse …
  out = out.replace(/\u00A6/g, "…");

  // falls noch High-ASCII drin ist, auf normale Quotes/Ellipse normalisieren
  out = out.replace(/[“”]/g, '"');

  return out;
}

function patchCompare(s) {
  let out = s;

  // "the const ..." -> "const ..."
  out = out.replace(/\bthe\s+const\b/g, "const");

  // vorsichtshalber: doppelte Leerzeichen aufräumen
  out = out.replace(/ {2,}/g, " ");

  return out;
}

const patchers = {
  "src/components/ThemePreview.tsx": patchThemePreview,
  "src/routes/Checkout.tsx": patchCheckout,
  "src/routes/Compare.tsx": patchCompare,
};

let changed = 0;
for (const rel of targets) {
  const p = path.resolve(rel);
  if (!fs.existsSync(p)) {
    console.log(`• skip (not found): ${rel}`);
    continue;
  }
  const before = fs.readFileSync(p, "utf8");
  const after = patchers[rel](before);
  if (after !== before) {
    fs.writeFileSync(p, after, "utf8");
    console.log(`✦ patched: ${rel}`);
    changed++;
  } else {
    console.log(`• ok: ${rel}`);
  }
}
console.log(`\nDone. ${changed} file(s) changed.`);
