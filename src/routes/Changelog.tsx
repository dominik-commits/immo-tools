// src/routes/Changelog.tsx
import React from "react";
import { NavLink } from "react-router-dom";
import { CHANGELOG, isRecent } from "../content/changelog";

export default function Changelog() {
  return (
    <main style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "40px 24px 80px" }}>
        <NavLink to="/" style={{ fontSize: 12.5, color: "rgba(255,255,255,0.45)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 24 }}>
          ← Zurück zum Dashboard
        </NavLink>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#e6edf3", margin: "0 0 8px", letterSpacing: "-0.3px" }}>
          Neuerungen
        </h1>
        <p style={{ fontSize: 13.5, color: "rgba(255,255,255,0.45)", margin: "0 0 32px" }}>
          Was sich bei PROPORA zuletzt getan hat.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {CHANGELOG.map((entry, i) => (
            <div key={i} style={{ display: "flex", gap: 16, padding: "18px 20px", background: "rgba(22,27,34,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
                {entry.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                  <h3 style={{ fontSize: 14.5, fontWeight: 700, color: "rgba(255,255,255,0.9)", margin: 0 }}>{entry.title}</h3>
                  {isRecent(entry.date) && (
                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 20, background: "rgba(252,220,69,0.15)", color: "#FCDC45", letterSpacing: "0.04em" }}>NEU</span>
                  )}
                </div>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.5, margin: "0 0 6px" }}>{entry.description}</p>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
                  {new Date(entry.date).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
