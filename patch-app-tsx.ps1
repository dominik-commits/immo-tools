# patch-app-tsx.ps1
# Fügt FinanzierungsVergleich in src\App.tsx ein: Import, Modul-Eintrag, Route, hideHeader-Liste.
# Ausführen aus dem Projektroot (frontend-Ordner), z. B.:
#   .\patch-app-tsx.ps1

$path = "src\App.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausführen)"
    exit 1
}

# Backup anlegen
Copy-Item $path "$path.bak" -Force
Write-Host "Backup angelegt: $path.bak"

$content = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$original = $content
$changes = 0

# 1) Import
$anchor1 = 'import FinanzierungSimple from "./routes/FinanzierungSimple";'
if ($content -match [regex]::Escape($anchor1)) {
    if ($content -notmatch [regex]::Escape('import FinanzierungsVergleich from "./routes/FinanzierungsVergleich";')) {
        $content = $content.Replace($anchor1, $anchor1 + "`nimport FinanzierungsVergleich from `"./routes/FinanzierungsVergleich`";")
        $changes++
        Write-Host "[1/4] Import hinzugefügt"
    } else {
        Write-Host "[1/4] Import existiert bereits - übersprungen"
    }
} else {
    Write-Warning "[1/4] Anker für Import nicht gefunden - bitte manuell prüfen"
}

# 2) MODULES-Eintrag
$anchor2 = @'
    href: "/finanzierung-simpel",
    requiredPlan: "basis",
  },
'@
$newModule = @'
  {
    key: "finanzierungsvergleich",
    title: "Finanzierungsvergleich",
    description: "Bis zu 5 Bankangebote nebeneinander vergleichen - inkl. Empfehlung.",
    icon: <IcoVergleich />,
    href: "/finanzierungsvergleich",
    requiredPlan: "basis",
  },
'@
if ($content.Contains($anchor2)) {
    if ($content -notmatch [regex]::Escape('key: "finanzierungsvergleich"')) {
        $content = $content.Replace($anchor2, $anchor2 + $newModule)
        $changes++
        Write-Host "[2/4] Modul-Eintrag hinzugefügt"
    } else {
        Write-Host "[2/4] Modul-Eintrag existiert bereits - übersprungen"
    }
} else {
    Write-Warning "[2/4] Anker für Modul-Eintrag nicht gefunden - bitte manuell prüfen"
}

# 3) Route
$anchor3 = @'
          <Route
            path="/finanzierung-simpel"
            element={
              <RequirePaid hasPaidPlan={hasPaidPlan}>
                <AppShell>
                  <FinanzierungSimple />
                </AppShell>
              </RequirePaid>
            }
          />
'@
$newRoute = @'

          <Route
            path="/finanzierungsvergleich"
            element={
              <RequirePaid hasPaidPlan={hasPaidPlan}>
                <AppShell>
                  <FinanzierungsVergleich />
                </AppShell>
              </RequirePaid>
            }
          />
'@
if ($content.Contains($anchor3)) {
    if ($content -notmatch [regex]::Escape('path="/finanzierungsvergleich"')) {
        $content = $content.Replace($anchor3, $anchor3 + $newRoute)
        $changes++
        Write-Host "[3/4] Route hinzugefügt"
    } else {
        Write-Host "[3/4] Route existiert bereits - übersprungen"
    }
} else {
    Write-Warning "[3/4] Anker für Route nicht gefunden - bitte manuell prüfen"
}

# 4) hideHeader-Liste
$anchor4 = '    location.pathname.startsWith("/finanzierung-simpel") ||'
if ($content.Contains($anchor4)) {
    if ($content -notmatch [regex]::Escape('location.pathname.startsWith("/finanzierungsvergleich")')) {
        $content = $content.Replace($anchor4, $anchor4 + "`n    location.pathname.startsWith(`"/finanzierungsvergleich`") ||")
        $changes++
        Write-Host "[4/4] hideHeader-Eintrag hinzugefügt"
    } else {
        Write-Host "[4/4] hideHeader-Eintrag existiert bereits - übersprungen"
    }
} else {
    Write-Warning "[4/4] Anker für hideHeader nicht gefunden - bitte manuell prüfen"
}

if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
    Write-Host "`n$changes Änderung(en) geschrieben nach $path"
} else {
    Write-Host "`nKeine Änderungen vorgenommen (alles bereits vorhanden oder Anker nicht gefunden)."
}
