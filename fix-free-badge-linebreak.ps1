# fix-free-badge-linebreak.ps1
# Behebt kaputte "`n"-Literale (statt echter Zeilenumbrueche) im FREE-Badge
# Ausfuehren aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\fix-free-badge-linebreak.ps1

$path = "src\components\AppShell.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausfuehren)"
    exit 1
}

Copy-Item $path "$path.bak-linebreakfix" -Force
Write-Host "Backup angelegt: $path.bak-linebreakfix"

$content = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$original = $content

$old = 'if (plan === "free") return (`n    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 600, letterSpacing: "0.06em", border: "1px solid rgba(16,185,129,0.25)" }}>FREE</span>`n  );'

$new = @'
if (plan === "free") return (
    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 600, letterSpacing: "0.06em", border: "1px solid rgba(16,185,129,0.25)" }}>FREE</span>
  );
'@

if ($content.Contains($old)) {
    $content = $content.Replace($old, $new.TrimEnd("`r","`n"))
    Write-Host "[OK] Zeilenumbrueche korrigiert"
} else {
    Write-Warning "[!!] Kaputte Zeile nicht gefunden - evtl. schon repariert oder Text weicht ab"
}

if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
    Write-Host "Datei geschrieben: $path"
} else {
    Write-Host "Keine Aenderungen vorgenommen."
}
