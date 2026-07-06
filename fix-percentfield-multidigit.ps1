# fix-percentfield-multidigit.ps1
# Behebt den Bug, dass in PercentField-Eingaben (z.B. Beleihungsquote) keine
# zweistelligen Werte eingetippt werden koennen, weil das Feld bei jedem
# Tastendruck neu formatiert wird. Wendet den Fix auf alle drei betroffenen
# Dateien an (Eigentumswohnung, EinfamilienhausCheck, GewerbeCheck).
# Ausfuehren aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\fix-percentfield-multidigit.ps1

$files = @(
    "src\routes\Eigentumswohnung.tsx",
    "src\routes\EinfamilienhausCheck.tsx",
    "src\routes\GewerbeCheck.tsx"
)

# Alter (kaputter) Block - CRLF wird vor dem Vergleich zu LF normalisiert
$oldBlockRaw = @'
function PercentField({
  label,
  value,
  onChange,
  step = 0.05,
  help,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  help?: string;
}) {
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="mt-1 flex items-center gap-2">
        <input
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
          type="number"
          step={step}
          value={((value ?? 0) * 100).toFixed(2)}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onFocus={(e) => e.currentTarget.select()}
        />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>%</span>
      </div>
    </div>
  );
}
'@

$newBlock = @'
function PercentField({
  label,
  value,
  onChange,
  step = 0.05,
  help,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  help?: string;
}) {
  const [focused, setFocused] = React.useState(false);
  const [draft, setDraft] = React.useState<string | null>(null);
  const decimals = step < 1 ? Math.max(0, Math.ceil(-Math.log10(step))) : 0;
  const rawValue = Number.isFinite(value) ? Number(((value ?? 0) * 100).toFixed(decimals)) : 0;
  const formattedValue = rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const displayVal = focused ? (draft ?? "") : formattedValue;
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="mt-1 flex items-center gap-2">
        <input
          className="w-full rounded-xl px-3 text-sm focus:outline-none transition-all"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.88)", height: 40, boxSizing: "border-box" }}
          type="text"
          inputMode="decimal"
          value={displayVal}
          placeholder={focused ? formattedValue : ""}
          onFocus={() => { setFocused(true); setDraft(""); }}
          onBlur={() => {
            setFocused(false);
            if (draft !== null && draft.trim() !== "") {
              const p = parseFloat(draft.replace(/\./g, "").replace(",", "."));
              if (Number.isFinite(p)) onChange(p / 100);
            }
            setDraft(null);
          }}
          onChange={(e) => {
            const r = e.target.value;
            setDraft(r);
            if (r.trim() !== "") {
              const p = parseFloat(r.replace(/\./g, "").replace(",", "."));
              if (Number.isFinite(p)) onChange(p / 100);
            }
          }}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()}
        />
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>%</span>
      </div>
    </div>
  );
}
'@

$oldBlock = $oldBlockRaw -replace "`r`n", "`n"

$totalChanges = 0
foreach ($path in $files) {
    if (-not (Test-Path $path)) {
        Write-Warning "Datei nicht gefunden, uebersprungen: $path"
        continue
    }

    $raw = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
    $normalized = $raw -replace "`r`n", "`n"

    if ($normalized.Contains($oldBlock)) {
        Copy-Item $path "$path.bak-percentfix" -Force
        $updated = $normalized.Replace($oldBlock, $newBlock)
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText((Resolve-Path $path), $updated, $utf8NoBom)
        Write-Host "[OK] $path gepatcht (Backup: $path.bak-percentfix)"
        $totalChanges++
    } elseif ($normalized -match [regex]::Escape('const [focused, setFocused] = React.useState')) {
        Write-Host "[--] $path scheint bereits gepatcht zu sein - uebersprungen"
    } else {
        Write-Warning "[!!] $path : identischer Block nicht gefunden - Datei weicht ab, bitte manuell pruefen"
    }
}

Write-Host "`nFertig. $totalChanges von $($files.Count) Dateien gepatcht."
