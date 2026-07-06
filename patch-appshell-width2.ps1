# patch-appshell-width2.ps1
# Sidebar-Breite nochmal erhöhen (264 -> 304px), da auch 264px noch nicht reichte
# Ausführen aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\patch-appshell-width2.ps1

$path = "src\components\AppShell.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausführen)"
    exit 1
}

Copy-Item $path "$path.bak-width2" -Force
Write-Host "Backup angelegt: $path.bak-width2"

$content = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$original = $content

$old = 'const sidebarWidth = collapsed ? 56 : 264;'
$new = 'const sidebarWidth = collapsed ? 56 : 304;'

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new)
    Write-Host "[OK] Sidebar-Breite 264 -> 304"
} elseif ($content.Contains($new)) {
    Write-Host "[--] Breite ist bereits 304"
} else {
    Write-Warning "[!!] Anker nicht gefunden - bitte manuell pruefen (aktuelle sidebarWidth-Zeile checken)"
}

if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
    Write-Host "Datei geschrieben: $path"
} else {
    Write-Host "Keine Aenderungen vorgenommen."
}
