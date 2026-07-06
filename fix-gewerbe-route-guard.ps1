# fix-gewerbe-route-guard.ps1
# Behebt Plan-Mismatch: /gewerbe war mit RequirePro geschuetzt, obwohl es BASIS sein soll
# Ausfuehren aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\fix-gewerbe-route-guard.ps1

$path = "src\App.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausfuehren)"
    exit 1
}

$oldBlockRaw = @'
          <Route
            path="/gewerbe"
            element={
              <RequirePro plan={plan}>
                <AppShell>
                  <GewerbeCheck />
                </AppShell>
              </RequirePro>
            }
          />
'@

$newBlockRaw = @'
          <Route
            path="/gewerbe"
            element={
              <RequirePaid hasPaidPlan={hasPaidPlan}>
                <AppShell>
                  <GewerbeCheck />
                </AppShell>
              </RequirePaid>
            }
          />
'@

$oldBlock = $oldBlockRaw -replace "`r`n", "`n"
$newBlock = $newBlockRaw -replace "`r`n", "`n"

$raw = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$normalized = $raw -replace "`r`n", "`n"

if ($normalized.Contains($oldBlock)) {
    Copy-Item $path "$path.bak-gewerbeguard" -Force
    Write-Host "Backup angelegt: $path.bak-gewerbeguard"
    $updated = $normalized.Replace($oldBlock, $newBlock)
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $updated, $utf8NoBom)
    Write-Host "[OK] /gewerbe-Route auf RequirePaid (BASIS) umgestellt"
} elseif ($normalized -match [regex]::Escape('path="/gewerbe"') -and $normalized -match [regex]::Escape('RequirePaid hasPaidPlan={hasPaidPlan}>')) {
    Write-Host "[--] Route scheint bereits korrekt zu sein"
} else {
    Write-Warning "[!!] Block nicht gefunden - Datei weicht ab, bitte manuell pruefen"
}
