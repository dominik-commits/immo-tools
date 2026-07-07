# fix-all-pdf-spacing-symbols.ps1
# Behebt in allen vier verbleibenden PDF-Generatoren (Gewerbe, EFH, Wohnung, MixedUse):
# 1) DSCR-Wert-Box zu niedrig (h=20 statt 22) -> Wert/Untertitel ueberlappen
# 2) Zeilenabstand nach der DSCR-Grafik zu knapp
# 3) Sonderzeichen (>=, Summenzeichen), die jsPDFs Standardschrift nicht darstellen kann
# Ausfuehren aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\fix-all-pdf-spacing-symbols.ps1

function Patch-File($path, $pairs) {
    if (-not (Test-Path $path)) {
        Write-Warning "Datei nicht gefunden, uebersprungen: $path"
        return
    }
    Copy-Item $path "$path.bak-pdffix" -Force
    $raw = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
    $content = $raw -replace "`r`n", "`n"
    $original = $content
    $changes = 0
    Write-Host "`n--- $path ---"
    foreach ($p in $pairs) {
        if ($content.Contains($p.old)) {
            $content = $content.Replace($p.old, $p.new)
            $changes++
            Write-Host "[OK] $($p.label)"
        } elseif ($content.Contains($p.new)) {
            Write-Host "[--] bereits gefixt: $($p.label)"
        } else {
            Write-Warning "[!!] Anker nicht gefunden: $($p.label)"
        }
    }
    if ($content -ne $original) {
        $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
        [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
        Write-Host "$changes Aenderung(en) geschrieben"
    } else {
        Write-Host "Keine Aenderungen vorgenommen"
    }
}

# ── Gewerbe ──────────────────────────────────────────────
Patch-File "src\utils\generateGewerbePdf.ts" @(
    @{
        old = 'r.kpi(ML, y, 36, 20, "DSCR-Wert", fmtNum(d.dscr), "NOI ÷ Kapitaldienst", "dark", C.yellow);'
        new = 'r.kpi(ML, y, 36, 22, "DSCR-Wert", fmtNum(d.dscr), "NOI ÷ Kapitaldienst", "dark", C.yellow);'
        label = "DSCR-Box-Hoehe 20 -> 22"
    },
    @{
        old = 'r.txt(d.dscr >= 1.2 ? "Ausreichend" : d.dscr >= 1.0 ? "Grenzwertig" : "Kritisch",' + "`n      ML + 160.5, y + 7.5, { size: 7.5, bold: true, color: bdgFc, align: `"center`" });`n    y += 22;"
        new = 'r.txt(d.dscr >= 1.2 ? "Ausreichend" : d.dscr >= 1.0 ? "Grenzwertig" : "Kritisch",' + "`n      ML + 160.5, y + 7.5, { size: 7.5, bold: true, color: bdgFc, align: `"center`" });`n    y += 26;"
        label = "Abstand nach DSCR-Grafik 22 -> 26"
    },
    @{
        old = 'r.txt("Grün ≥ 1,20 (bankfähig)  ·  Orange ≥ 1,00 (grenzwertig)  ·  Rot < 1,00 (kritisch)  ·  Gelb = Basisszenario",'
        new = 'r.txt("Grün ab 1,20 (bankfähig)  ·  Orange ab 1,00 (grenzwertig)  ·  Rot unter 1,00 (kritisch)  ·  Gelb = Basisszenario",'
        label = "Legenden-Sonderzeichen ersetzt"
    },
    @{
        old = '"∑ Gesamt",'
        new = '"Gesamt",'
        label = "Summenzeichen in Zonen-Tabelle ersetzt"
    }
)

# ── EFH ──────────────────────────────────────────────────
Patch-File "src\utils\generateEFHPdf.ts" @(
    @{
        old = 'r.kpi(ML, y, 36, 20, "DSCR-Wert", fmtNum(d.dscr), "NOI ÷ Kapitaldienst", "dark", C.yellow);'
        new = 'r.kpi(ML, y, 36, 22, "DSCR-Wert", fmtNum(d.dscr), "NOI ÷ Kapitaldienst", "dark", C.yellow);'
        label = "DSCR-Box-Hoehe 20 -> 22"
    },
    @{
        old = 'r.txt(d.dscr >= 1.2 ? "Ausreichend" : d.dscr >= 1.0 ? "Grenzwertig" : "Kritisch",' + "`n      ML + 160.5, y + 7.5, { size: 7.5, bold: true, color: bdgFc, align: `"center`" });`n    y += 22;"
        new = 'r.txt(d.dscr >= 1.2 ? "Ausreichend" : d.dscr >= 1.0 ? "Grenzwertig" : "Kritisch",' + "`n      ML + 160.5, y + 7.5, { size: 7.5, bold: true, color: bdgFc, align: `"center`" });`n    y += 26;"
        label = "Abstand nach DSCR-Grafik 22 -> 26"
    }
)

# ── Wohnung ──────────────────────────────────────────────
Patch-File "src\utils\generateWohnungPdf.ts" @(
    @{
        old = 'r.kpiTile(ML, y, 36, 20, "DSCR-Wert", dscrVal.toFixed(2), "NOI ÷ Kapitaldienst", "dark",'
        new = 'r.kpiTile(ML, y, 36, 22, "DSCR-Wert", dscrVal.toFixed(2), "NOI ÷ Kapitaldienst", "dark",'
        label = "DSCR-Box-Hoehe 20 -> 22"
    },
    @{
        old = 'r["text"](dscrBadgeTxt, ML + 160, y + 8.5, { size: 7.5, bold: true, color: dscrBadgeColor as any, align: "center" });' + "`n  y += 22;"
        new = 'r["text"](dscrBadgeTxt, ML + 160, y + 8.5, { size: 7.5, bold: true, color: dscrBadgeColor as any, align: "center" });' + "`n  y += 26;"
        label = "Abstand nach DSCR-Grafik 22 -> 26"
    },
    @{
        old = 'r["text"]("Grün ≥ 1,20 (bankfähig)  ·  Orange ≥ 1,00 (grenzwertig)  ·  Rot < 1,00 (kritisch)  ·  Gelb = Basisszenario",'
        new = 'r["text"]("Grün ab 1,20 (bankfähig)  ·  Orange ab 1,00 (grenzwertig)  ·  Rot unter 1,00 (kritisch)  ·  Gelb = Basisszenario",'
        label = "Legenden-Sonderzeichen ersetzt"
    }
)

# ── MixedUse ─────────────────────────────────────────────
Patch-File "src\utils\generateMixedUsePdf.ts" @(
    @{
        old = 'r.kpi(ML, y, 36, 20, "DSCR-Wert", fmtNum(d.dscr), "NOI ÷ Kapitaldienst", "dark", C.yellow);'
        new = 'r.kpi(ML, y, 36, 22, "DSCR-Wert", fmtNum(d.dscr), "NOI ÷ Kapitaldienst", "dark", C.yellow);'
        label = "DSCR-Box-Hoehe 20 -> 22"
    },
    @{
        old = 'r.txt(d.dscr >= 1.2 ? "Ausreichend" : d.dscr >= 1.0 ? "Grenzwertig" : "Kritisch",' + "`n      ML + 160.5, y + 7.5, { size: 7.5, bold: true, color: bdgFc, align: `"center`" });`n    y += 22;"
        new = 'r.txt(d.dscr >= 1.2 ? "Ausreichend" : d.dscr >= 1.0 ? "Grenzwertig" : "Kritisch",' + "`n      ML + 160.5, y + 7.5, { size: 7.5, bold: true, color: bdgFc, align: `"center`" });`n    y += 26;"
        label = "Abstand nach DSCR-Grafik 22 -> 26"
    }
)

Write-Host "`nFertig."
