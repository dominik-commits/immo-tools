$targets = @(
  "src\components\ThemePreview.tsx",
  "src\routes\AfaRechner.tsx",
  "src\routes\Eigentumswohnung.tsx",
  "src\routes\Finanzierung.tsx",
  "src\routes\FinanzierungSimple.tsx",
  "src\routes\GewerbeCheck.tsx",
  "src\routes\Home.tsx",
  "src\routes\MFHCheck.tsx",
  "src\routes\Mietkalkulation.tsx",
  "src\routes\Mietkalkulator.tsx",
  "src\routes\Pricing.tsx",
  "src\routes\WohnCheck.tsx"
)

# Fix-Mapping (UTF-8)
$map = @{
  'Ã¤' = 'ä'; 'Ã„' = 'Ä';
  'Ã¶' = 'ö'; 'Ã–' = 'Ö';
  'Ã¼' = 'ü'; 'Ãœ' = 'Ü';
  'ÃŸ' = 'ß';
  'Â ' = ' '; 'Â' = '';
  'â€“' = '–'; 'â€”' = '—';
  'â€ž' = '„'; 'â€œ' = '“'; 'â€ť' = '”'; 'â€˜' = '‚'; 'â€™' = '’';
  'â€¦' = '…';
  'â‚¬' = '€'; 'â†’' = '→'
}

$changed = 0
foreach ($f in $targets) {
  if (-not (Test-Path $f)) { continue }
  $c = Get-Content $f -Raw -Encoding UTF8
  $orig = $c
  foreach ($k in $map.Keys) {
    $c = $c -replace [regex]::Escape($k), [string]$map[$k]
  }
  if ($c -ne $orig) {
    $changed++
    $c | Set-Content -Encoding UTF8 $f
    Write-Host "✓ fixed: $f"
  }
}

Write-Host "`nFertig. Dateien geändert: $changed"
