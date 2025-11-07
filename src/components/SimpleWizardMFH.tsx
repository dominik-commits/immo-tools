// src/components/SimpleWizardMFH.tsx
import * as React from "react";
import { Info } from "lucide-react";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border p-4 bg-card ${className}`}>{children}</div>;
}

function NumberField({
  label, value, onChange, step = 1, min, max, help,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number; min?: number; max?: number; help?: string;
}) {
  return (
    <label className="text-sm grid gap-1">
      <span className="text-muted-foreground inline-flex items-center gap-2">
        {label}
        {help && (
          <span className="inline-flex items-center" title={help} aria-label={help}>
            <Info className="h-3.5 w-3.5 text-gray-400" />
          </span>
        )}
      </span>
      <input
        className="w-full rounded-xl border px-3 py-2"
        type="number" step={step} min={min} max={max}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
    </label>
  );
}

function PercentSlider({
  label, value, onChange, min = 0, max = 0.95, step = 0.001, help,
}: {
  label: string; value: number; onChange: (n: number) => void;
  min?: number; max?: number; step?: number; help?: string;
}) {
  const pct = (v: number) => (Math.round(v * 1000) / 10).toFixed(1) + " %";
  return (
    <label className="text-sm grid gap-1">
      <span className="text-muted-foreground inline-flex items-center gap-2">
        {label}
        {help && (
          <span className="inline-flex items-center" title={help} aria-label={help}>
            <Info className="h-3.5 w-3.5 text-gray-400" />
          </span>
        )}
      </span>
      <div className="flex items-center gap-3">
        <input type="range" className="w-full"
          min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span className="w-20 text-right tabular-nums">{pct(value)}</span>
      </div>
    </label>
  );
}

export default function SimpleWizardMFH({
  // aktuelle Werte (werden angezeigt)
  kaufpreis, setKaufpreis,
  gesamtFlaecheM2, setGesamtFlaecheM2,
  mieteProM2Monat, setMieteProM2Monat,
  leerstandPct, setLeerstandPct,
  financingOn, setFinancingOn,
  zinsPct, setZinsPct,
  onUseExample,
  onSwitchToAdvanced,
}: {
  kaufpreis: number; setKaufpreis: (n: number) => void;
  gesamtFlaecheM2: number; setGesamtFlaecheM2: (n: number) => void;
  mieteProM2Monat: number; setMieteProM2Monat: (n: number) => void;
  leerstandPct: number; setLeerstandPct: (n: number) => void;
  financingOn: boolean; setFinancingOn: (b: boolean) => void;
  zinsPct: number; setZinsPct: (n: number) => void;
  onUseExample: () => void;
  onSwitchToAdvanced: () => void;
}) {
  const [step, setStep] = React.useState<1 | 2 | 3>(1);

  return (
    <div className="space-y-4">
      {/* Stepper */}
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${step===1?'bg-gray-900 text-white':'bg-gray-100 text-gray-700'}`}>1</span>
        <span>Objekt</span>
        <span className="h-px w-8 bg-gray-200" />
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${step===2?'bg-gray-900 text-white':'bg-gray-100 text-gray-700'}`}>2</span>
        <span>Finanzierung</span>
        <span className="h-px w-8 bg-gray-200" />
        <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full ${step===3?'bg-gray-900 text-white':'bg-gray-100 text-gray-700'}`}>3</span>
        <span>Ergebnis</span>
      </div>

      {step === 1 && (
        <Card>
          <div className="grid grid-cols-1 gap-3">
            <NumberField label="Kaufpreis (€)" value={kaufpreis} onChange={setKaufpreis} />
            <NumberField label="Gesamtfläche (m²)" value={gesamtFlaecheM2} onChange={setGesamtFlaecheM2} />
            <NumberField label="Ø Kaltmiete (€/m²/Monat)" value={mieteProM2Monat} onChange={setMieteProM2Monat} step={0.1} />
            <PercentSlider label="Leerstand (Quote)" value={leerstandPct} onChange={setLeerstandPct}
              help="Mietausfall durch Fluktuation/Neuvermietung. 0–20 % üblich." max={0.2}
            />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50" onClick={onUseExample}>
              Mit Beispielwerten füllen
            </button>
            <button className="px-3 py-2 rounded-lg bg-[#0F2C8A] text-white hover:brightness-110" onClick={() => setStep(2)}>
              Weiter
            </button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <div className="flex items-center justify-between">
            <label className="text-sm inline-flex items-center gap-2">
              <input type="checkbox" checked={financingOn} onChange={(e) => setFinancingOn(e.target.checked)} />
              Finanzierung berücksichtigen
            </label>
          </div>
          {financingOn && (
            <div className="grid grid-cols-1 gap-3 mt-3">
              <PercentSlider label="Zins p.a." value={zinsPct} onChange={setZinsPct} min={0.005} max={0.08} step={0.0005}
                help="Zinssatz deiner Finanzierung p.a." />
            </div>
          )}
          <div className="mt-3 flex items-center justify-between">
            <button className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50" onClick={() => setStep(1)}>
              Zurück
            </button>
            <button className="px-3 py-2 rounded-lg bg-[#0F2C8A] text-white hover:brightness-110" onClick={() => setStep(3)}>
              Weiter
            </button>
          </div>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <p className="text-sm text-gray-700">
            Super – die wichtigsten Angaben sind drin. Unten siehst du die Bewertung (Ampel, Cashflow, DSCR).
            Du kannst die Details später im <b>Erweitert-Modus</b> verfeinern.
          </p>
          <div className="mt-3 flex items-center justify-between">
            <button className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50" onClick={() => setStep(2)}>
              Zurück
            </button>
            <button className="px-3 py-2 rounded-lg bg-gray-900 text-white hover:brightness-110" onClick={onSwitchToAdvanced}>
              Zu „Erweitert“ wechseln
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}
