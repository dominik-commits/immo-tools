// scripts/fix-build-issues-4.cjs
const fs = require("fs");
const path = require("path");

const file = "src/routes/Checkout.tsx";
const p = path.resolve(file);
if (!fs.existsSync(p)) {
  console.log("• skip (not found):", file);
  process.exit(0);
}

let s = fs.readFileSync(p, "utf8");

// kaputte Zeile robust ersetzen (egal, was aktuell dazwischen steht)
s = s.replace(
  /const\s*\[\s*message\s*,\s*setMessage\s*\]\s*=\s*useState<string>\([^)]*\);?/,
  'const [message, setMessage] = useState<string>("Starte Checkout ...");'
);

// typografische Quotes normalisieren (falls noch vorhanden)
s = s.replace(/[“”„]/g, '"');

// doppelte Anführungszeichen aufräumen
s = s.replace(/""+/g, '"');

fs.writeFileSync(p, s, "utf8");
console.log("✦ patched:", file);
