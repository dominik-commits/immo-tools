# patch-apptsx-appshell-portfolio-extension.ps1
# Fuegt AppShell (Sidebar) fuer /portfolio und /extension hinzu
# Ausfuehren aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\patch-apptsx-appshell-portfolio-extension.ps1

$path = "src\App.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausfuehren)"
    exit 1
}

Copy-Item $path "$path.bak-appshell-pf-ext" -Force
Write-Host "Backup angelegt: $path.bak-appshell-pf-ext"

$content = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$original = $content
$changes = 0

# 1) Portfolio-Route
$old1 = '<Route path="/portfolio" element={<Portfolio />} />'
$new1 = '<Route path="/portfolio" element={<AppShell><Portfolio /></AppShell>} />'
if ($content.Contains($old1)) {
    $content = $content.Replace($old1, $new1)
    $changes++
    Write-Host "[OK] Portfolio-Route mit AppShell umschlossen"
} elseif ($content.Contains($new1)) {
    Write-Host "[--] Portfolio-Route bereits umschlossen"
} else {
    Write-Warning "[!!] Anker fuer Portfolio-Route nicht gefunden - bitte manuell pruefen"
}

# 2) Extension-Route
$old2 = '<Route path="/extension" element={<RequireLogin><Extension /></RequireLogin>} />'
$new2 = '<Route path="/extension" element={<RequireLogin><AppShell><Extension /></AppShell></RequireLogin>} />'
if ($content.Contains($old2)) {
    $content = $content.Replace($old2, $new2)
    $changes++
    Write-Host "[OK] Extension-Route mit AppShell umschlossen"
} elseif ($content.Contains($new2)) {
    Write-Host "[--] Extension-Route bereits umschlossen"
} else {
    Write-Warning "[!!] Anker fuer Extension-Route nicht gefunden - bitte manuell pruefen"
}

# 3) hideHeader: /portfolio ergaenzen (echter Zeilenumbruch direkt im String, kein Escape noetig)
$old3 = 'location.pathname.startsWith("/extension") ||'
$new3 = 'location.pathname.startsWith("/extension") ||
    location.pathname.startsWith("/portfolio") ||'
if ($content.Contains($old3) -and (-not ($content -match [regex]::Escape('startsWith("/portfolio")')))) {
    $content = $content.Replace($old3, $new3)
    $changes++
    Write-Host "[OK] hideHeader: /portfolio ergaenzt"
} elseif ($content -match [regex]::Escape('startsWith("/portfolio")')) {
    Write-Host "[--] hideHeader fuer /portfolio bereits vorhanden"
} else {
    Write-Warning "[!!] Anker fuer hideHeader nicht gefunden - bitte manuell pruefen"
}

if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
    Write-Host "`n$changes Aenderung(en) geschrieben nach $path"
} else {
    Write-Host "`nKeine Aenderungen vorgenommen."
}
