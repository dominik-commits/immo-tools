# patch-appshell.ps1
# Fügt Finanzierungsvergleich als BASIS-Tool in die linke Seitennavigation (AppShell.tsx) ein.
# Ausführen aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\patch-appshell.ps1

$path = "src\components\AppShell.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausführen)"
    exit 1
}

Copy-Item $path "$path.bak" -Force
Write-Host "Backup angelegt: $path.bak"

$content = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$original = $content
$changes = 0

# 1) Icon-Import ergänzen
$anchor1 = '  Chrome,
} from "lucide-react";'
$replacement1 = '  Chrome,
  GitCompare,
} from "lucide-react";'
if ($content.Contains($anchor1)) {
    if ($content -notmatch [regex]::Escape('GitCompare')) {
        $content = $content.Replace($anchor1, $replacement1)
        $changes++
        Write-Host "[1/2] Icon-Import (GitCompare) hinzugefügt"
    } else {
        Write-Host "[1/2] Icon-Import existiert bereits - übersprungen"
    }
} else {
    Write-Warning "[1/2] Anker für Icon-Import nicht gefunden - bitte manuell prüfen"
}

# 2) Nav-Eintrag in TOOL_ITEMS ergänzen
$anchor2 = '  { href: "/finanzierung-simpel", label: "Finanzierungsrechner", icon: <Calculator size={16} />, plan: "basis" },'
$replacement2 = $anchor2 + "`n" + '  { href: "/finanzierungsvergleich", label: "Finanzierungsvergleich", icon: <GitCompare size={16} />, plan: "basis" },'
if ($content.Contains($anchor2)) {
    if ($content -notmatch [regex]::Escape('/finanzierungsvergleich')) {
        $content = $content.Replace($anchor2, $replacement2)
        $changes++
        Write-Host "[2/2] Nav-Eintrag hinzugefügt"
    } else {
        Write-Host "[2/2] Nav-Eintrag existiert bereits - übersprungen"
    }
} else {
    Write-Warning "[2/2] Anker für Nav-Eintrag nicht gefunden - bitte manuell prüfen"
}

if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
    Write-Host "`n$changes Aenderung(en) geschrieben nach $path"
} else {
    Write-Host "`nKeine Aenderungen vorgenommen (alles bereits vorhanden oder Anker nicht gefunden)."
}
