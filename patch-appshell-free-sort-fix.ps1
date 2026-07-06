# patch-appshell-free-sort-fix.ps1
# Nachschlag: FREE-Badge + Sortierung mit einzeiligen Ankern (robuster gegen CRLF/LF)
# Ausfuehren aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\patch-appshell-free-sort-fix.ps1

$path = "src\components\AppShell.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausfuehren)"
    exit 1
}

Copy-Item $path "$path.bak-freesort2" -Force
Write-Host "Backup angelegt: $path.bak-freesort2"

$content = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$original = $content
$changes = 0

# 1) FREE-Badge
$old1 = 'if (plan === "free") return null;'
$new1 = 'if (plan === "free") return (`n    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 600, letterSpacing: "0.06em", border: "1px solid rgba(16,185,129,0.25)" }}>FREE</span>`n  );'
if ($content.Contains($old1)) {
    $content = $content.Replace($old1, $new1)
    $changes++
    Write-Host "[OK] FREE-Badge ergaenzt"
} elseif ($content -match [regex]::Escape('>FREE</span>')) {
    Write-Host "[--] FREE-Badge existiert bereits"
} else {
    Write-Warning "[!!] Anker 1 nicht gefunden - bitte manuell pruefen"
}

# 2) Sortierung beim Rendern
$old2 = '{NAV_ITEMS.map((item) => ('
$new2 = '{[...NAV_ITEMS].sort((a, b) => PLAN_ORDER[a.plan] - PLAN_ORDER[b.plan]).map((item) => ('
if ($content.Contains($old2)) {
    $content = $content.Replace($old2, $new2)
    $changes++
    Write-Host "[OK] Analyzer-Sektion wird jetzt nach Plan sortiert"
} elseif ($content -match [regex]::Escape('[...NAV_ITEMS].sort')) {
    Write-Host "[--] Sortierung existiert bereits"
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
