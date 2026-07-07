# fix-portfolio-dropdown-clip.ps1
# Behebt Design-Bug: Status-Dropdown wird vom "overflow: hidden" der Karte abgeschnitten
# Ausfuehren aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\fix-portfolio-dropdown-clip.ps1

$path = "src\routes\Portfolio.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausfuehren)"
    exit 1
}

Copy-Item $path "$path.bak-dropdownclip" -Force
Write-Host "Backup angelegt: $path.bak-dropdownclip"

$content = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$original = $content
$changes = 0

# 1) overflow: hidden vom Karten-Container entfernen
$old1 = '<div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, overflow: "hidden", opacity: deleting ? 0.5 : 1, transition: "opacity 0.2s" }}>'
$new1 = '<div style={{ background: "rgba(22,27,34,0.8)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, opacity: deleting ? 0.5 : 1, transition: "opacity 0.2s" }}>'
if ($content.Contains($old1)) {
    $content = $content.Replace($old1, $new1)
    $changes++
    Write-Host "[OK] overflow: hidden von der Karte entfernt"
} elseif ($content.Contains($new1)) {
    Write-Host "[--] bereits entfernt"
} else {
    Write-Warning "[!!] Anker 1 nicht gefunden - bitte manuell pruefen"
}

# 2) Farbleiste bekommt eigene obere Rundung
$old2 = '<div style={{ height: 3, background: color }} />'
$new2 = '<div style={{ height: 3, background: color, borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />'
if ($content.Contains($old2)) {
    $content = $content.Replace($old2, $new2)
    $changes++
    Write-Host "[OK] Farbleiste bekommt eigene Eck-Rundung"
} elseif ($content.Contains($new2)) {
    Write-Host "[--] bereits vorhanden"
} else {
    Write-Warning "[!!] Anker 2 nicht gefunden - bitte manuell pruefen"
}

if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
    Write-Host "`n$changes Aenderung(en) geschrieben nach $path"
} else {
    Write-Host "`nKeine Aenderungen vorgenommen."
}
