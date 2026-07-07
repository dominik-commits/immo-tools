# fix-mfhpdf-spacing-symbols.ps1
# Behebt 3 Probleme im MFH-PDF-Export:
# 1) DSCR-Wert-Box zu niedrig (h=20 statt 22) -> Wert und Untertitel ueberlappen
# 2) Zeilenabstand nach der DSCR-Grafik zu knapp
# 3) Sonderzeichen (>=, Summenzeichen), die jsPDFs Standardschrift nicht darstellen kann
# Ausfuehren aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\fix-mfhpdf-spacing-symbols.ps1

$path = "src\utils\generateMFHPdf.ts"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausfuehren)"
    exit 1
}

Copy-Item $path "$path.bak-pdffix" -Force
Write-Host "Backup angelegt: $path.bak-pdffix"

$raw = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$content = $raw -replace "`r`n", "`n"
$original = $content
$changes = 0

# 1) DSCR-Box Hoehe 20 -> 22
$old1 = 'r.kpi(ML, y, 36, 20, "DSCR-Wert", fmtNum(d.dscr), "NOI ÷ Kapitaldienst", "dark",'
$new1 = 'r.kpi(ML, y, 36, 22, "DSCR-Wert", fmtNum(d.dscr), "NOI ÷ Kapitaldienst", "dark",'
if ($content.Contains($old1)) {
    $content = $content.Replace($old1, $new1)
    $changes++
    Write-Host "[OK] DSCR-Box-Hoehe 20 -> 22 (behebt Ueberlappung)"
} elseif ($content.Contains($new1)) {
    Write-Host "[--] bereits gefixt"
} else {
    Write-Warning "[!!] Anker 1 nicht gefunden - bitte manuell pruefen"
}

# 2) Zeilenabstand nach DSCR-Grafik
$old2 = 'r.txt(bdgTxt, ML + 160.5, y + 7.5, { size: 7.5, bold: true, color: bdgFc, align: "center" });' + "`n  y += 22;"
$new2 = 'r.txt(bdgTxt, ML + 160.5, y + 7.5, { size: 7.5, bold: true, color: bdgFc, align: "center" });' + "`n  y += 26;"
if ($content.Contains($old2)) {
    $content = $content.Replace($old2, $new2)
    $changes++
    Write-Host "[OK] Abstand nach DSCR-Grafik vergroessert (22 -> 26)"
} elseif ($content.Contains($new2)) {
    Write-Host "[--] bereits gefixt"
} else {
    Write-Warning "[!!] Anker 2 nicht gefunden - bitte manuell pruefen"
}

# 3) Legende: "ab" statt Sonderzeichen
$old3 = 'r.txt("Grün ≥ 1,20 (bankfähig)  ·  Orange ≥ 1,00 (grenzwertig)  ·  Rot < 1,00 (kritisch)  ·  Gelb = Basisszenario",'
$new3 = 'r.txt("Grün ab 1,20 (bankfähig)  ·  Orange ab 1,00 (grenzwertig)  ·  Rot unter 1,00 (kritisch)  ·  Gelb = Basisszenario",'
if ($content.Contains($old3)) {
    $content = $content.Replace($old3, $new3)
    $changes++
    Write-Host "[OK] Legenden-Sonderzeichen ersetzt"
} elseif ($content.Contains($new3)) {
    Write-Host "[--] bereits gefixt"
} else {
    Write-Warning "[!!] Anker 3 nicht gefunden - bitte manuell pruefen"
}

# 4) Summenzeichen in Mieteinheiten-Tabelle
$old4 = 'unitRows.push(["∑ Gesamt",'
$new4 = 'unitRows.push(["Gesamt",'
if ($content.Contains($old4)) {
    $content = $content.Replace($old4, $new4)
    $changes++
    Write-Host "[OK] Summenzeichen in Tabellen-Zeile ersetzt"
} elseif ($content.Contains($new4)) {
    Write-Host "[--] bereits gefixt"
} else {
    Write-Warning "[!!] Anker 4 nicht gefunden - bitte manuell pruefen"
}

if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
    Write-Host "`n$changes Aenderung(en) geschrieben nach $path"
} else {
    Write-Host "`nKeine Aenderungen vorgenommen."
}
