# patch-appshell-free-sort.ps1
# 1) FREE-Badge fuer kostenlose Analyzer/Tools ergaenzen
# 2) Analyzer-Sektion automatisch nach Plan sortieren (free -> basis -> pro)
# Ausfuehren aus dem Projektroot (frontend-Ordner):
#   powershell -ExecutionPolicy Bypass -File .\patch-appshell-free-sort.ps1

$path = "src\components\AppShell.tsx"

if (-not (Test-Path $path)) {
    Write-Error "Datei nicht gefunden: $path (Skript aus dem frontend-Ordner ausfuehren)"
    exit 1
}

Copy-Item $path "$path.bak-freesort" -Force
Write-Host "Backup angelegt: $path.bak-freesort"

$content = [System.IO.File]::ReadAllText((Resolve-Path $path), [System.Text.Encoding]::UTF8)
$original = $content
$changes = 0

# 1) PlanBadge: FREE-Badge statt null zurueckgeben
$oldBadge = @'
function PlanBadge({ plan }: { plan: "free" | "basis" | "pro" }) {
  if (plan === "free") return null;
  if (plan === "basis") return (
'@
$newBadge = @'
function PlanBadge({ plan }: { plan: "free" | "basis" | "pro" }) {
  if (plan === "free") return (
    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: "rgba(16,185,129,0.12)", color: "#10b981", fontWeight: 600, letterSpacing: "0.06em", border: "1px solid rgba(16,185,129,0.25)" }}>FREE</span>
  );
  if (plan === "basis") return (
'@
if ($content.Contains($oldBadge)) {
    $content = $content.Replace($oldBadge, $newBadge)
    $changes++
    Write-Host "[OK] FREE-Badge ergaenzt"
} elseif ($content.Contains('>FREE</span>')) {
    Write-Host "[--] FREE-Badge existiert bereits"
} else {
    Write-Warning "[!!] Anker fuer FREE-Badge nicht gefunden - bitte manuell pruefen"
}

# 2) PLAN_ORDER-Konstante ergaenzen (vor NAV_ITEMS)
$oldConst = 'const NAV_ITEMS: NavItem[] = ['
$newConst = @'
const PLAN_ORDER: Record<"free" | "basis" | "pro", number> = { free: 0, basis: 1, pro: 2 };

const NAV_ITEMS: NavItem[] = [
'@
if ($content.Contains($oldConst) -and ($content -notmatch [regex]::Escape('const PLAN_ORDER'))) {
    $content = $content.Replace($oldConst, $newConst)
    $changes++
    Write-Host "[OK] PLAN_ORDER-Konstante ergaenzt"
} elseif ($content -match [regex]::Escape('const PLAN_ORDER')) {
    Write-Host "[--] PLAN_ORDER existiert bereits"
} else {
    Write-Warning "[!!] Anker fuer PLAN_ORDER nicht gefunden - bitte manuell pruefen"
}

# 3) Beim Rendern der Analyzer-Sektion sortieren
$oldRender = @'
          <SectionLabel label="Analyzer" collapsed={collapsed} />
          {NAV_ITEMS.map((item) => (
            <SidebarItem key={item.href} item={item} collapsed={collapsed} />
          ))}
'@
$newRender = @'
          <SectionLabel label="Analyzer" collapsed={collapsed} />
          {[...NAV_ITEMS].sort((a, b) => PLAN_ORDER[a.plan] - PLAN_ORDER[b.plan]).map((item) => (
            <SidebarItem key={item.href} item={item} collapsed={collapsed} />
          ))}
'@
if ($content.Contains($oldRender)) {
    $content = $content.Replace($oldRender, $newRender)
    $changes++
    Write-Host "[OK] Analyzer-Sektion wird jetzt nach Plan sortiert"
} elseif ($content -match [regex]::Escape('[...NAV_ITEMS].sort')) {
    Write-Host "[--] Sortierung existiert bereits"
} else {
    Write-Warning "[!!] Anker fuer Sortierung nicht gefunden - bitte manuell pruefen"
}

if ($content -ne $original) {
    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText((Resolve-Path $path), $content, $utf8NoBom)
    Write-Host "`n$changes Aenderung(en) geschrieben nach $path"
} else {
    Write-Host "`nKeine Aenderungen vorgenommen."
}
