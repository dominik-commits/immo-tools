import React from "react";

/**
 * ThemePreview.tsx
 * Kleine visuelle Prüffläche für dein Propora-Theme (Tailwind + CSS Variables).
 * - zeigt Brand-Farben, Surface, Accent, Charts
 * - Typografie-Hierarchie (h1–p)
 * - Buttons, Cards, Inputs mit deinen Tokens
 * - Light/Dark Toggle (setzt .dark auf <html>)
 *
 * Nutzung:
 *   1) Datei nach: src/components/ThemePreview.tsx
 *   2) In einer Route/Seite einbinden:
 *        import ThemePreview from "@/components/ThemePreview";
 *        export default function Page(){ return <ThemePreview /> }
 */

type Swatch = {
  label: string;
  cssVar: string; // z.B. "--primary"
  fgVar?: string; // z.B. "--primary-foreground"
};

const SWATCHES: Swatch[] = [
  { label: "Primary", cssVar: "--primary", fgVar: "--primary-foreground" },
  { label: "Accent (CTA)", cssVar: "--accent", fgVar: "--accent-foreground" },
  { label: "Surface / Secondary", cssVar: "--surface" },
  { label: "Background", cssVar: "--background" },
  { label: "Foreground (Text)", cssVar: "--foreground" },
  { label: "Border", cssVar: "--border" },
  { label: "Muted", cssVar: "--muted", fgVar: "--muted-foreground" },
  { label: "Card", cssVar: "--card", fgVar: "--card-foreground" },
];

const CHART_SWATCHES: Swatch[] = [
  { label: "Chart 1", cssVar: "--chart-1" },
  { label: "Chart 2", cssVar: "--chart-2" },
  { label: "Chart 3", cssVar: "--chart-3" },
  { label: "Chart 4", cssVar: "--chart-4" },
  { label: "Chart 5", cssVar: "--chart-5" },
];

function ColorBox({ label, cssVar, fgVar }: Swatch) {
  const bg = `hsl(var(${cssVar}))`;
  const fg = fgVar ? `hsl(var(${fgVar}))` : "inherit";
  return (
    <div className="rounded-[var(--radius)] border border-border overflow-hidden shadow-soft">
      <div
        className="h-16 w-full"
        style={{ backgroundColor: bg }}
        aria-hidden
      />
      <div className="p-3 text-sm">
        <div className="font-semibold">{label}</div>
        <div className="flex items-center gap-2 mt-1">
          <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">
            {cssVar}
          </span>
          {fgVar && (
            <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-xs">
              {fgVar}
            </span>
          )}
        </div>
        {fgVar && (
          <div
            className="mt-2 text-xs font-medium inline-flex items-center px-2 py-1 rounded"
            style={{ color: fg, backgroundColor: bg }}
          >
            Beispiel-Text auf {label}
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleDark() {
  const [isDark, setIsDark] = React.useState(
    typeof document !== "undefined" &&
      document.documentElement.classList.contains("dark")
  );
  const toggle = () => {
    const el = document.documentElement;
    el.classList.toggle("dark");
    setIsDark(el.classList.contains("dark"));
  };
  return (
    <button
      onClick={toggle}
      className="inline-flex items-center gap-2 rounded-[var(--radius)] border border-border px-3 py-2 text-sm font-semibold hover:bg-secondary hover:text-secondary-foreground transition"
    >
      {isDark ? "ðŸŒ™ Dark aktiv" : "~€ï¸ Light aktiv"}
    </button>
  );
}

export default function ThemePreview() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Page header */}
      <div className="mx-auto max-w-6xl px-5 py-8 md:py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-primary">
              Propora Theme Preview
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">
              Prüfe, ob Farben, Typografie, Radius & Schatten 1:1 wie auf
              propora.de gerendert werden.
            </p>
          </div>
          <ToggleDark />
        </div>

        {/* COLORS */}
        <section className="mt-8">
          <h2 className="text-lg font-bold text-foreground mb-3">Farben</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {SWATCHES.map((s) => (
              <ColorBox key={s.label} {...s} />
            ))}
          </div>

          <h3 className="text-sm font-semibold text-muted-foreground mt-6 mb-2">
            Diagrammfarben
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {CHART_SWATCHES.map((s) => (
              <div key={s.label} className="rounded-[var(--radius)] border border-border p-3">
                <div
                  className="h-10 rounded mb-2"
                  style={{ backgroundColor: `hsl(var(${s.cssVar}))` }}
                />
                <div className="text-xs font-medium">{s.label}</div>
                <div className="text-[10px] mt-1 text-muted-foreground">{s.cssVar}</div>
              </div>
            ))}
          </div>
        </section>

        {/* TYPOGRAPHY */}
        <section className="mt-10">
          <h2 className="text-lg font-bold text-foreground mb-3">Typografie</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-5">
              <h1 className="text-3xl md:text-4xl font-extrabold text-primary">H1 – Überschrift</h1>
              <p className="text-muted-foreground mt-1">
                Inter – Bold/ExtraBold. Nutzt <code>text-primary</code> für Propora-Blau.
              </p>
              <h2 className="text-2xl font-bold mt-6">H2 – Abschnitt</h2>
              <p className="text-muted-foreground">
                Subheads mit <code>text-muted-foreground</code>.
              </p>
              <h3 className="text-xl font-semibold mt-6">H3 – Unterpunkt</h3>
              <p className="text-sm mt-2 leading-7">
                FließtextgrÃße (sm–base) mit <code>leading-7</code> für ruhigen Rhythmus.
                Links <a className="text-primary hover:underline" href="#">sehen so aus</a>.
              </p>
            </div>

            {/* COMPONENTS */}
            <div className="card p-5">
              <h3 className="text-lg font-bold">Komponenten</h3>
              <div className="mt-3 grid gap-3">
                <div className="flex gap-3">
                  <button className="btn-primary">Button Primary</button>
                  <button className="btn-pro">Button Pro</button>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-[var(--radius)] border border-input bg-card p-3">
                    <label className="text-xs text-muted-foreground">E-Mail</label>
                    <input
                      className="mt-1 w-full bg-transparent outline-none"
                      placeholder="mail@beispiel.de"
                    />
                  </div>
                  <div className="rounded-[var(--radius)] border border-input bg-card p-3">
                    <label className="text-xs text-muted-foreground">Auswahl</label>
                    <select className="mt-1 w-full bg-transparent outline-none">
                      <option>Option A</option>
                      <option>Option B</option>
                    </select>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Shadows</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[var(--radius)] bg-card border border-border p-3 shadow-sm text-xs">
                      shadow-sm
                    </div>
                    <div className="rounded-[var(--radius)] bg-card border border-border p-3 shadow-soft text-xs">
                      shadow-soft
                    </div>
                    <div className="rounded-[var(--radius)] bg-card border border-border p-3 shadow-medium text-xs">
                      shadow-medium
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CARDS / LIST PREVIEW */}
        <section className="mt-10">
          <h2 className="text-lg font-bold mb-3">Card/Vorschau (Quick-Checks Stil)</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Wohn-Check", desc: "In 60 Sekunden prüfen, ob sich eine Wohnimmobilie lohnt.", icon: "ðŸ " },
              { title: "Gewerbe (light)", desc: "Gleiche Logik, Fokus auf Leerstands­ sensitivität.", icon: "ðŸ¢" },
              { title: "MFH (light)", desc: "Mehrere Einheiten grob kalkulieren.", icon: "ðŸ~ï¸" },
              { title: "Mietkalkulation", desc: "Warm/Kalt, umlagefähig – einfach erklärt.", icon: "ðŸ§®" },
              { title: "AfA-Rechner", desc: "Baujahr †’ Satz †’ AfA/Jahr. Einsteigerfreundlich.", icon: "ðŸ“Š" },
              { title: "Finanzierung", desc: "Annuität, DSCR, max. Kaufpreis.", icon: "ðŸ¦" },
            ].map((c) => (
              <div
                key={c.title}
                className="card p-4 hover:shadow-medium transition border border-border"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-primary text-xl">{c.icon}</div>
                    <h4 className="font-semibold text-foreground mt-1">{c.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{c.desc}</p>
                  </div>
                  <div className="text-muted-foreground text-xl">†’</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="text-xs text-muted-foreground mt-10">
          Propora Theme Preview ”¢ Tokens via <code>propora-theme.css</code> ”¢ Tailwind utilities aktiv
        </footer>
      </div>
    </div>
  );
}


