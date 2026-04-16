// src/components/AnalyzerMegaMenu.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { ChevronDown, Lock } from "lucide-react";

type Plan = "basis" | "pro";
type Module = {
  key: string; title: string; description: string;
  icon: React.ReactNode; href: string; requiredPlan: Plan | "any";
};
type Props = {
  plan: Plan; modules: Module[];
  variant?: "desktop" | "mobile"; onNavigate?: () => void;
};

const BORDER   = "rgba(255,255,255,0.08)";
const TEXT     = "rgba(255,255,255,0.88)";
const TEXT_DIM = "rgba(255,255,255,0.45)";
const YELLOW   = "#FCDC45";
const BG_HOVER = "rgba(255,255,255,0.05)";

export default function AnalyzerMegaMenu({ plan, modules, variant = "desktop", onNavigate }: Props) {
  const basisModules = modules.filter((m) => m.requiredPlan !== "pro");
  const proModules   = modules.filter((m) => m.requiredPlan === "pro");

  if (variant === "mobile") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {[["BASIS-ANALYZER", basisModules], ["PRO-ANALYZER", proModules]].map(([label, mods]) => (
          <div key={label as string}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT_DIM, marginBottom: 8 }}>{label as string}</div>
            {(mods as Module[]).map((m) => {
              const locked = m.requiredPlan === "pro" && plan !== "pro";
              return (
                <NavLink key={m.key} to={locked ? "/upgrade" : m.href} onClick={onNavigate}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", borderRadius: 10, textDecoration: "none", marginBottom: 2 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{m.icon}</div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: TEXT }}>
                      {m.title}
                      {m.requiredPlan === "pro" && <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20, background: "rgba(252,220,69,0.12)", color: YELLOW, border: "1px solid rgba(252,220,69,0.25)", fontWeight: 600 }}>PRO</span>}
                    </div>
                    <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 2 }}>{m.description}</div>
                  </div>
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <button type="button" onClick={() => setOpen((v) => !v)}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20, background: YELLOW, color: "#111", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
        Analyzer
        <ChevronDown style={{ width: 14, height: 14, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {open && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", width: 520, background: "#111318", border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, boxShadow: "0 12px 40px rgba(0,0,0,0.5)", zIndex: 50 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_DIM }}>Immo-Analyzer</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>Wähle ein Tool, um dein Objekt zu prüfen.</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Basis */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT_DIM, marginBottom: 10 }}>Basis-Analyzer</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {basisModules.map((m) => (
                  <NavLink key={m.key} to={m.href} onClick={() => { setOpen(false); onNavigate?.(); }}
                    style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", borderRadius: 10, textDecoration: "none", transition: "background 0.1s" }}
                    onMouseEnter={e => (e.currentTarget.style.background = BG_HOVER)}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{m.icon}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{m.title}</div>
                      <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 1, lineHeight: 1.4 }}>{m.description}</div>
                    </div>
                  </NavLink>
                ))}
              </div>
            </div>

            {/* PRO */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: TEXT_DIM, marginBottom: 10 }}>PRO-Analyzer</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {proModules.map((m) => {
                  const locked = plan !== "pro";
                  return (
                    <NavLink key={m.key} to={locked ? "/upgrade" : m.href} onClick={() => { setOpen(false); onNavigate?.(); }}
                      style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 10px", borderRadius: 10, textDecoration: "none", transition: "background 0.1s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = BG_HOVER)}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                      <div style={{ width: 30, height: 30, borderRadius: 8, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{m.icon}</div>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: TEXT }}>
                          {m.title}
                          <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20, background: "rgba(252,220,69,0.12)", color: YELLOW, border: "1px solid rgba(252,220,69,0.25)", fontWeight: 600 }}>PRO</span>
                          {locked && <Lock style={{ width: 12, height: 12, color: TEXT_DIM }} />}
                        </div>
                        <div style={{ fontSize: 11, color: TEXT_DIM, marginTop: 1, lineHeight: 1.4 }}>{m.description}</div>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
