# fix-gewerbe-percentfield.ps1
# Behebt den Mehrstellig-Eingabe-Bug im PercentField von GewerbeCheck.tsx
# Ausfuehren aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\fix-gewerbe-percentfield.ps1

$path = "src\routes\GewerbeCheck.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausfuehren)"
    exit 1
}

$oldBlockRaw = @'
function PercentField({
  label,
  value,
  onChange,
  step = 0.005,
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
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={95}
          step={step ? step * 100 : 0.5}
          value={(value * 100).toFixed(2).replace(/\.?0+$/, "")}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          onWheel={(e) => (e.currentTarget as HTMLInputElement).blur()} onFocus={(e) => e.currentTarget.select()}
          className="w-full"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#f0f0f0", fontSize: 13, outline: "none" }}
        />
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, flexShrink: 0 }}>%</span>
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
  step = 0.005,
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
  const percentStep = step ? step * 100 : 0.5;
  const decimals = percentStep < 1 ? Math.max(0, Math.ceil(-Math.log10(percentStep))) : 0;
  const rawValue = Number.isFinite(value) ? Number((value * 100).toFixed(decimals)) : 0;
  const formattedValue = rawValue.toLocaleString("de-DE", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const displayVal = focused ? (draft ?? "") : formattedValue;
  return (
    <div>
      <LabelWithHelp label={label} help={help} />
      <div className="flex items-center gap-2">
        <input
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
          className="w-full"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 10px", color: "#f0f0f0", fontSize: 13, outline: "none" }}
        />
        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, flexShrink: 0 }}>%</span>
      </div>
    </div>
  );
}
'@

$oldBlock = $oldBlockRaw -replace "`r`n", "`n"

$raw = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$normalized = $raw -replace "`r`n", "`n"

if ($normalized.Contains($oldBlock)) {
    Copy-Item $path "$path.bak-percentfix" -Force
    Write-Host "Backup angelegt: $path.bak-percentfix"
    $updated = $normalized.Replace($oldBlock, $newBlock)
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $updated, $utf8NoBom)
    Write-Host "[OK] $path gepatcht"
} else {
    Write-Warning "[!!] Block nicht gefunden - Datei weicht ab, bitte manuell pruefen"
}
