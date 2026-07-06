# patch-appshell-rename-width.ps1
# 1) Sidebar-Breite von 220px auf 264px erhöhen (nichts mehr abgeschnitten)
# 2) Analyzer-Namen in der Sidebar vereinheitlichen (<Typ>-Analyse)
# Ausführen aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\patch-appshell-rename-width.ps1

$path = "src\components\AppShell.tsx"

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
    @{ old = 'const sidebarWidth = collapsed ? 56 : 220;'; new = 'const sidebarWidth = collapsed ? 56 : 264;'; label = 'Sidebar-Breite (220 -> 264)' },
    @{ old = 'label: "Wohnungs-Rendite"'; new = 'label: "Wohnungs-Analyse"'; label = 'Wohnungs-Rendite -> Wohnungs-Analyse' },
    @{ old = 'label: "Mietshaus-Analyse"'; new = 'label: "Mehrfamilienhaus-Analyse"'; label = 'Mietshaus-Analyse -> Mehrfamilienhaus-Analyse' },
    @{ old = 'label: "EFH-Rendite"'; new = 'label: "Einfamilienhaus-Analyse"'; label = 'EFH-Rendite -> Einfamilienhaus-Analyse' },
    @{ old = 'label: "Gewerbe-Rendite"'; new = 'label: "Gewerbe-Analyse"'; label = 'Gewerbe-Rendite -> Gewerbe-Analyse' },
    @{ old = 'label: "Gemischte Immo."'; new = 'label: "Gemischte-Immobilie-Analyse"'; label = 'Gemischte Immo. -> Gemischte-Immobilie-Analyse' }
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
