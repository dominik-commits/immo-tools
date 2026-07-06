# patch-apptsx-rename.ps1
# Analyzer-Namen in Dashboard-Kacheln + Mega-Menü vereinheitlichen (App.tsx MODULES-Array)
# Ausführen aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\patch-apptsx-rename.ps1

$path = "src\App.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausführen)"
    exit 1
}

Copy-Item $path "$path.bak-rename" -Force
Write-Host "Backup angelegt: $path.bak-rename"

$content = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$original = $content
$changes = 0

$pairs = @(
    @{ old = 'title: "Wohnungs-Rendite"'; new = 'title: "Wohnungs-Analyse"'; label = 'Wohnungs-Rendite -> Wohnungs-Analyse' },
    @{ old = 'title: "Mietshaus-Analyse"'; new = 'title: "Mehrfamilienhaus-Analyse"'; label = 'Mietshaus-Analyse -> Mehrfamilienhaus-Analyse' },
    @{ old = 'title: "Einfamilienhaus-Rendite"'; new = 'title: "Einfamilienhaus-Analyse"'; label = 'Einfamilienhaus-Rendite -> Einfamilienhaus-Analyse' },
    @{ old = 'title: "Gewerbe-Rendite"'; new = 'title: "Gewerbe-Analyse"'; label = 'Gewerbe-Rendite -> Gewerbe-Analyse' },
    @{ old = 'title: "Gemischte Immobilie"'; new = 'title: "Gemischte-Immobilie-Analyse"'; label = 'Gemischte Immobilie -> Gemischte-Immobilie-Analyse' }
)

foreach ($p in $pairs) {
    if ($content.Contains($p.old)) {
        $content = $content.Replace($p.old, $p.new)
        $changes++
        Write-Host "[OK] $($p.label)"
    } elseif ($content.Contains($p.new)) {
        Write-Host "[--] bereits vorhanden: $($p.label)"
    } else {
        Write-Warning "[!!] Anker nicht gefunden: $($p.label) - bitte manuell prüfen"
    }
}

if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
    Write-Host "`n$changes Aenderung(en) geschrieben nach $path"
} else {
    Write-Host "`nKeine Aenderungen vorgenommen."
}
