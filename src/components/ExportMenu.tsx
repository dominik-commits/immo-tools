// src/components/ExportMenu.tsx
import * as React from "react";
import { Download } from "lucide-react";

export type ExportFormat = "json" | "csv" | "pdf";

export default function ExportMenu({
  onExport,
  className = "",
}: {
  onExport: (formats: ExportFormat[]) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<Record<ExportFormat, boolean>>({
    json: true,
    csv: false,
    pdf: false,
  });

  const rootRef = React.useRef<HTMLDivElement>(null);

  // außen-klicken schließt
  React.useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  function toggle(key: ExportFormat) {
    setSelected((s) => ({ ...s, [key]: !s[key] }));
  }

  function startExport() {
    const formats = (Object.keys(selected) as ExportFormat[]).filter((k) => selected[k]);
    if (formats.length === 0) return; // nichts gewählt
    onExport(formats);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm hover:shadow transition"
      >
        <Download className="h-4 w-4" />
        Export
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-72 rounded-2xl border border-gray-200 bg-white shadow-xl p-3 z-50"
          role="dialog"
          aria-label="Exportformate wählen"
        >
          <div className="text-[13px] font-medium text-gray-900 mb-2">Formate wählen</div>

          <div className="space-y-2 text-sm text-gray-800">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.json}
                onChange={() => toggle("json")}
                className="h-4 w-4"
              />
              <span>JSON</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.csv}
                onChange={() => toggle("csv")}
                className="h-4 w-4"
              />
              <span>CSV</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selected.pdf}
                onChange={() => toggle("pdf")}
                className="h-4 w-4"
              />
              <span>PDF</span>
            </label>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white hover:bg-gray-50"
            >
              Abbrechen
            </button>
            <button
              type="button"
              onClick={startExport}
              className="px-3 py-1.5 rounded-lg text-sm bg-[#0F2C8A] text-white hover:brightness-[1.05]"
            >
              Export starten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
