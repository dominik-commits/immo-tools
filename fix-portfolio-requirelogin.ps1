# fix-portfolio-requirelogin.ps1
# Ergaenzt RequireLogin fuer /portfolio (war bisher ungeschuetzt)
# Ausfuehren aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\fix-portfolio-requirelogin.ps1

$path = "src\App.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausfuehren)"
    exit 1
}

Copy-Item $path "$path.bak-portfolioauth" -Force
Write-Host "Backup angelegt: $path.bak-portfolioauth"

$content = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$original = $content

$old = '<Route path="/portfolio" element={<AppShell><Portfolio /></AppShell>} />'
$new = '<Route path="/portfolio" element={<RequireLogin><AppShell><Portfolio /></AppShell></RequireLogin>} />'

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Write-Host "[OK] /portfolio jetzt mit RequireLogin geschuetzt"
} elseif ($content.Contains($new)) {
    Write-Host "[--] Route ist bereits geschuetzt"
} else {
    Write-Warning "[!!] Anker nicht gefunden - bitte manuell pruefen"
}

if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
    Write-Host "Datei geschrieben: $path"
} else {
    Write-Host "Keine Aenderungen vorgenommen."
}
