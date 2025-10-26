// src/routes/MFHCheck.tsx
import React from "react";
import { Plus, Minus, Layers, Building2, Sigma, Download, Upload } from "lucide-react";

type Mode = "gesamt" | "einheiten";

type Unit = {
  id: string;
  label: string;
  sqm: number | "";
  rentPerSqm?: number | "";
};

// ---------- Utils ----------
const LS_KEY = "mfh-check/v1";

function eur(n: number | ""): string {
  if (n === "" || Number.isNaN(n)) return "–";
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
}
function num(n: number | ""): number {
  return typeof n === "number" ? n : n === "" ? 0 : Number(n) || 0;
}
function ts(): string {
  const d = new Date();
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`;
}
function downloadBlob(filename: string, mime: string, content: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function MFHCheck() {
  const [mode, setMode] = React.useState<Mode>("gesamt");

  // --- State für Modus "gesamt"
  const [gesamtQm, setGesamtQm] = React.useState<number | "">("");
  const [gesamtEinheiten, setGesamtEinheiten] = React.useState<number | "">("");

  // --- State für Modus "einheiten"
  const [units, setUnits] = React.useState<Unit[]>([
    { id: crypto.randomUUID(), label: "WE 1", sqm: 60, rentPerSqm: 12 },
    { id: crypto.randomUUID(), label: "WE 2", sqm: 55, rentPerSqm: 11.5 },
  ]);

  // Summen (abgeleitet)
  const sumSqmEinheiten = units.reduce((acc, u) => acc + num(u.sqm), 0);
  const anzahlEinheiten = units.length;
  const sumColdRentEinheiten = units.reduce((acc, u) => acc + num(u.sqm) * num(u.rentPerSqm ?? 0), 0);

  // Sichtbare Summen
  const visibleGesamtQm = mode === "gesamt" ? num(gesamtQm) : sumSqmEinheiten;
  const visibleEinheiten = mode === "gesamt" ? num(gesamtEinheiten) : anzahlEinheiten;

  // ---------- Actions ----------
  function addUnit() {
    const nextIdx = units.length + 1;
    setUnits((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: `WE ${nextIdx}`, sqm: 50, rentPerSqm: 11 },
    ]);
  }
  function removeUnit(id: string) {
    setUnits((prev) => prev.filter((u) => u.id !== id));
  }
  function updateUnit(id: string, patch: Partial<Unit>) {
    setUnits((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  // ---------- Export/Import ----------
  function buildExportObject() {
    return {
      generatedAt: new Date().toISOString(),
      mode,
      totals: {
        areaSqm: visibleGesamtQm,
        units: visibleEinheiten,
        monthlyColdRent: mode === "einheiten" ? Math.round(sumColdRentEinheiten) : null,
      },
      data:
        mode === "gesamt"
          ? {
              totalAreaSqm: num(gesamtQm),
              totalUnits: num(gesamtEinheiten),
            }
          : {
              units: units.map((u, i) => ({
                index: i + 1,
                label: u.label,
                sqm: num(u.sqm),
                rentPerSqm: u.rentPerSqm === "" ? null : num(u.rentPerSqm ?? 0),
                monthlyColdRent: Math.round(num(u.sqm) * num(u.rentPerSqm ?? 0)),
              })),
            },
    };
  }

  function onExportJSON() {
    const obj = buildExportObject();
    downloadBlob(`mfh_export_${ts()}.json`, "application/json;charset=utf-8", JSON.stringify(obj, null, 2));
  }

  function onExportCSV() {
    if (mode === "gesamt") {
      const rows = [
        ["Modus", "Gesamtfläche (m²)", "Einheiten (Anzahl)"],
        ["gesamt", String(num(gesamtQm)), String(num(gesamtEinheiten))],
      ];
      const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
      downloadBlob(`mfh_export_${ts()}.csv`, "text/csv;charset=utf-8", csv);
      return;
    }

    // einheiten
    const header = ["#", "Bezeichnung", "Wohnfläche (m²)", "Kaltmiete/m²", "Monatsmiete (brutto kalt)"];
    const body = units.map((u, i) => {
      const sqm = num(u.sqm);
      const rps = u.rentPerSqm === "" ? "" : num(u.rentPerSqm ?? 0);
      const cold = rps === "" ? "" : Math.round(sqm * Number(rps));
      return [i + 1, u.label, sqm, rps, cold];
    });
    const totals = ["Summe", "", sumSqmEinheiten, "", Math.round(sumColdRentEinheiten) || ""];
    const rows = [header, ...body, totals];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    downloadBlob(`mfh_export_${ts()}.csv`, "text/csv;charset=utf-8", csv);
  }

  function onExportPDF() {
    const obj = buildExportObject();

    const makeTableRows = () => {
      if (mode === "gesamt") {
        return `
          <tr><th style="text-align:left;">Modus</th><td>Gesamtfläche</td></tr>
          <tr><th style="text-align:left;">Gesamtfläche</th><td>${obj.totals.areaSqm.toLocaleString("de-DE")} m²</td></tr>
          <tr><th style="text-align:left;">Einheiten</th><td>${obj.totals.units}</td></tr>
        `;
      } else {
        const unitRows = units
          .map((u, i) => {
            const sqm = num(u.sqm).toLocaleString("de-DE");
            const rps = u.rentPerSqm === "" ? "–" : num(u.rentPerSqm ?? 0).toLocaleString("de-DE");
            const cold =
              u.rentPerSqm === "" || u.sqm === ""
                ? "–"
                : eur(Math.round(num(u.sqm) * num(u.rentPerSqm ?? 0)));
            return `<tr>
              <td>${i + 1}</td>
              <td>${escapeHtml(u.label)}</td>
              <td style="text-align:right;">${sqm}</td>
              <td style="text-align:right;">${rps}</td>
              <td style="text-align:right;">${cold}</td>
            </tr>`;
          })
          .join("");

        return `
          <tr><th style="text-align:left;">Modus</th><td>Einheiten</td></tr>
          <tr><th style="text-align:left;">Gesamtfläche</th><td>${obj.totals.areaSqm.toLocaleString("de-DE")} m²</td></tr>
          <tr><th style="text-align:left;">Einheiten</th><td>${obj.totals.units}</td></tr>
          ${
            obj.totals.monthlyColdRent
              ? `<tr><th style="text-align:left;">∑ Kaltmiete/Monat</th><td>${eur(obj.totals.monthlyColdRent)}</td></tr>`
              : ""
          }
          </table>
          <h3 style="margin:16px 0 8px 0;">Wohneinheiten</h3>
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="text-align:left; border-bottom:1px solid #ccc;">#</th>
                <th style="text-align:left; border-bottom:1px solid #ccc;">Bezeichnung</th>
                <th style="text-align:right; border-bottom:1px solid #ccc;">Wohnfläche (m²)</th>
                <th style="text-align:right; border-bottom:1px solid #ccc;">Kaltmiete/m²</th>
                <th style="text-align:right; border-bottom:1px solid #ccc;">Monatsmiete</th>
              </tr>
            </thead>
            <tbody>
              ${unitRows}
              <tr>
                <td colspan="2" style="text-align:right; font-weight:600; border-top:1px solid #eee;">Summe</td>
                <td style="text-align:right; font-weight:600; border-top:1px solid #eee;">${sumSqmEinheiten.toLocaleString("de-DE")}</td>
                <td></td>
                <td style="text-align:right; font-weight:600; border-top:1px solid #eee;">${
                  obj.totals.monthlyColdRent ? eur(obj.totals.monthlyColdRent) : "–"
                }</td>
              </tr>
            </tbody>
          `;
      }
    };

    const html = `
<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>Mehrfamilienhaus Export – ${ts()}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans', 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'; margin: 24px; color: #111; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 16px 0 8px; }
  h3 { font-size: 14px; margin: 12px 0 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { padding: 6px 8px; }
  th { text-align: left; }
  tr + tr td { border-top: 1px solid #eee; }
  .meta { color: #555; font-size: 12px; margin-bottom: 12px; }
  @media print { a[href]:after { content: ""; } }
</style>
</head>
<body>
  <h1>Mehrfamilienhaus – Export</h1>
  <div class="meta">Erstellt am ${new Date(obj.generatedAt).toLocaleString("de-DE")}</div>

  <h2>Zusammenfassung</h2>
  <table>
    ${makeTableRows()}
  </table>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 250); };</script>
</body>
</html>
    `.trim();

    const win = window.open("", "_blank", "noopener,noreferrer");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
    }
  }

  function onImportJSON(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result || "");
        const data = JSON.parse(text);
        if (data.mode === "gesamt") {
          setMode("gesamt");
          setGesamtQm(Number(data?.data?.totalAreaSqm) || "");
          setGesamtEinheiten(Number(data?.data?.totalUnits) || "");
        } else {
          setMode("einheiten");
          const arr = Array.isArray(data?.data?.units) ? data.data.units : [];
          setUnits(
            arr.map((u: any, i: number) => ({
              id: crypto.randomUUID(),
              label: u.label ?? `WE ${i + 1}`,
              sqm: Number(u.sqm) || "",
              rentPerSqm: typeof u.rentPerSqm === "number" ? u.rentPerSqm : "",
            }))
          );
        }
      } catch (e) {
        alert("JSON konnte nicht gelesen werden.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  // ---------- Persistenz ----------
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.mode === "gesamt") {
        setMode("gesamt");
        setGesamtQm(saved.data?.totalAreaSqm ?? "");
        setGesamtEinheiten(saved.data?.totalUnits ?? "");
      } else if (saved.mode === "einheiten") {
        setMode("einheiten");
        if (Array.isArray(saved.data?.units)) {
          setUnits(
            saved.data.units.map((u: any, i: number) => ({
              id: crypto.randomUUID(),
              label: u.label ?? `WE ${i + 1}`,
              sqm: Number(u.sqm) || "",
              rentPerSqm: typeof u.rentPerSqm === "number" ? u.rentPerSqm : "",
            }))
          );
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    const payload = buildExportObject();
    localStorage.setItem(LS_KEY, JSON.stringify(payload));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, gesamtQm, gesamtEinheiten, units]);

  // ---------- Render ----------
  return (
    <div className="mx-auto max-w-5xl px-3 py-6 sm:px-4 lg:px-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <Building2 className="h-6 w-6 text-gray-500" />
            Mehrfamilienhaus
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Wähle, ob du die Gesamtfläche direkt eingibst oder die einzelnen Wohneinheiten erfasst.
          </p>
        </div>

        {/* Live-Summen */}
        <div className="hidden rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 sm:flex sm:flex-col sm:items-end">
          <div className="flex items-center gap-2">
            <Sigma className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Gesamtfläche:</span>
            <span className="tabular-nums">{visibleGesamtQm.toLocaleString("de-DE")} m²</span>
          </div>
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-gray-500" />
            <span className="font-medium">Einheiten:</span>
            <span className="tabular-nums">{visibleEinheiten}</span>
          </div>
          {mode === "einheiten" && sumColdRentEinheiten > 0 && (
            <div className="mt-1 flex items-center gap-2">
              <span className="font-medium text-gray-700">∑ Kaltmiete/Monat:</span>
              <span className="tabular-nums">{eur(sumColdRentEinheiten)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Mode Switch + Export/Import */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-xl border border-gray-200 bg-white p-1 text-sm shadow-sm">
          <button
            className={`rounded-lg px-3 py-1.5 ${mode === "gesamt" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
            onClick={() => setMode("gesamt")}
          >
            Gesamtfläche eingeben
          </button>
          <button
            className={`rounded-lg px-3 py-1.5 ${mode === "einheiten" ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"}`}
            onClick={() => setMode("einheiten")}
          >
            Einheiten erfassen
          </button>
        </div>

        {/* Export/Import Buttons */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={onExportJSON}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            title="Als JSON exportieren"
          >
            <Download className="h-4 w-4" /> JSON
          </button>
          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
            title="Als CSV exportieren"
          >
            <Download className="h-4 w-4" /> CSV
          </button>
          <button
            onClick={onExportPDF}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F2C8A] px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
            title="Als PDF speichern (Druckdialog)"
          >
            <Download className="h-4 w-4" /> PDF
          </button>

          {/* JSON Import */}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
            <Upload className="h-4 w-4" />
            JSON importieren
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportJSON(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Linke Spalte: Eingaben */}
        <div className="lg:col-span-2">
          {/* Modus: Gesamt */}
          {mode === "gesamt" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-base font-semibold text-gray-900">Gesamtdaten</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-700">Gesamtfläche (m²)</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={gesamtQm}
                    onChange={(e) => setGesamtQm(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="z. B. 450"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none ring-0 focus:border-gray-400"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-sm text-gray-700">Einheiten (Anzahl)</span>
                  <input
                    type="number"
                    min={0}
                    step="1"
                    value={gesamtEinheiten}
                    onChange={(e) => setGesamtEinheiten(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="z. B. 8"
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none ring-0 focus:border-gray-400"
                  />
                </label>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Tipp: Wenn du nur die Gesamtfläche kennst, reicht das für eine erste grobe Einschätzung.
              </p>
            </section>
          )}

          {/* Modus: Einheiten */}
          {mode === "einheiten" && (
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-gray-900">Wohneinheiten</h2>
                <button
                  onClick={addUnit}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#0F2C8A] px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
                >
                  <Plus className="h-4 w-4" /> Einheit hinzufügen
                </button>
              </div>

              <div className="space-y-3">
                {units.map((u, idx) => (
                  <div key={u.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={u.label}
                          onChange={(e) => updateUnit(u.id, { label: e.target.value })}
                          className="w-36 rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-900 focus:border-gray-400"
                        />
                      </div>
                      <button
                        onClick={() => removeUnit(u.id)}
                        className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50"
                        title="Einheit entfernen"
                      >
                        <Minus className="h-3.5 w-3.5" /> Entfernen
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <label className="flex flex-col gap-1">
                        <span className="text-sm text-gray-700">Wohnfläche (m²)</span>
                        <input
                          type="number"
                          min={0}
                          step="1"
                          value={u.sqm}
                          onChange={(e) => updateUnit(u.id, { sqm: e.target.value === "" ? "" : Number(e.target.value) })}
                          placeholder="z. B. 60"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400"
                        />
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-sm text-gray-700">Kaltmiete / m² (optional)</span>
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          value={u.rentPerSqm ?? ""}
                          onChange={(e) => updateUnit(u.id, { rentPerSqm: e.target.value === "" ? "" : Number(e.target.value) })}
                          placeholder="z. B. 11,50"
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-gray-400"
                        />
                      </label>

                      <div className="flex flex-col justify-end">
                        <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-700">
                          <div className="flex items-center justify-between">
                            <span>Monatsmiete (brutto kalt)</span>
                            <span className="tabular-nums font-semibold">
                              {u.rentPerSqm && u.sqm ? eur(num(u.rentPerSqm) * num(u.sqm)) : "–"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {units.length === 0 && (
                <div className="mt-3 rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                  Noch keine Einheiten erfasst. Klicke auf „Einheit hinzufügen“.
                </div>
              )}

              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-800">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="font-medium">∑ Fläche:</span>{" "}
                    <span className="tabular-nums">{sumSqmEinheiten.toLocaleString("de-DE")} m²</span>
                  </div>
                  <div>
                    <span className="font-medium">Einheiten:</span>{" "}
                    <span className="tabular-nums">{anzahlEinheiten}</span>
                  </div>
                  <div>
                    <span className="font-medium">∑ Kaltmiete/Monat:</span>{" "}
                    <span className="tabular-nums">{sumColdRentEinheiten ? eur(sumColdRentEinheiten) : "–"}</span>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>

        {/* Rechte Spalte: Zusammenfassung / Export */}
        <aside className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-gray-900">Zusammenfassung</h3>
            <dl className="space-y-2 text-sm text-gray-800">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-600">Modus</dt>
                <dd className="font-medium">{mode === "gesamt" ? "Gesamtfläche" : "Einheiten"}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-600">Gesamtfläche</dt>
                <dd className="tabular-nums font-medium">{visibleGesamtQm.toLocaleString("de-DE")} m²</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-gray-600">Einheiten</dt>
                <dd className="tabular-nums font-medium">{visibleEinheiten}</dd>
              </div>
              {mode === "einheiten" && (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-gray-600">∑ Kaltmiete/Monat</dt>
                  <dd className="tabular-nums font-medium">
                    {sumColdRentEinheiten ? eur(sumColdRentEinheiten) : "–"}
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="mb-2 text-base font-semibold text-gray-900">Export &amp; Import</h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={onExportJSON}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" /> JSON
              </button>
              <button
                onClick={onExportCSV}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                <Download className="h-4 w-4" /> CSV
              </button>
              <button
                onClick={onExportPDF}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0F2C8A] px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
              >
                <Download className="h-4 w-4" /> PDF
              </button>

              {/* JSON Import */}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50">
                <Upload className="h-4 w-4" />
                JSON importieren
                <input
                  type="file"
                  accept="application/json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onImportJSON(f);
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              PDF nutzt den Druckdialog deines Browsers (Datei → Als PDF speichern). Eingaben werden automatisch lokal gespeichert.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
