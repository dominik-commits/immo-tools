// scripts/fix-umlaute.cjs
const fs = require("fs");

const FILES = [
  "src/routes/Eigentumswohnung.tsx",
  "src/routes/MFHCheck.tsx",
];

const REPLACES = [
  [/VermÃ¶gen/g, "Vermoegen"],
  [/Vermögen/g, "Vermoegen"],
  // falls irgendwo noch Typ-Annotationen/Labels mit Umlaut sind:
  [/("VermÃ¶gen"|\'VermÃ¶gen\')/g, '"Vermoegen"'],
  [/("Vermögen"|\'Vermögen\')/g, '"Vermoegen"'],
];

let changed = 0;
for (const f of FILES) {
  if (!fs.existsSync(f)) continue;
  let txt = fs.readFileSync(f, "utf8");
  let before = txt;
  for (const [re, to] of REPLACES) txt = txt.replace(re, to);
  if (txt !== before) {
    fs.writeFileSync(f, txt, "utf8");
    console.log("✦ patched:", f);
    changed++;
  } else {
    console.log("• ok:", f);
  }
}
console.log("\nDone.", changed, "file(s) changed.");
