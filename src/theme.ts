// src/theme.ts
// Propora Design Tokens – einheitlich für alle Analyzer

/* ── Colors ─────────────────────────────────────────────────── */
export const BG            = "#0d1117";
export const BG_CARD       = "rgba(22,27,34,0.9)";
export const BG_CARD_INPUT = "rgba(252,220,69,0.03)";
export const BG_INPUT      = "rgba(255,255,255,0.05)";
export const BG_SUBTLE     = "rgba(255,255,255,0.03)";

export const BORDER        = "rgba(255,255,255,0.08)";
export const BORDER_ACCENT = "rgba(252,220,69,0.12)";

export const TEXT          = "rgba(255,255,255,0.88)";
export const TEXT_MUTED    = "rgba(255,255,255,0.5)";
export const TEXT_DIM      = "rgba(255,255,255,0.3)";
export const TEXT_ACCENT   = "#FCDC45";

export const YELLOW        = "#FCDC45";
export const GREEN         = "#4ade80";
export const RED           = "#f87171";
export const AMBER         = "#f59e0b";
export const BLUE_DARK     = "#1b2c47";

/* ── Typography ─────────────────────────────────────────────── */
export const T = {
  // Überschriften
  h1:          { fontSize: 18, fontWeight: 700, color: TEXT,       margin: 0, lineHeight: 1.2 } as React.CSSProperties,
  subtitle:    { fontSize: 12, color: "rgba(255,255,255,0.38)",    margin: "3px 0 0" }           as React.CSSProperties,

  // Sektions-Label (SCHRITT 1 — …)
  sectionLabel:{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const, color: TEXT_DIM },

  // Card-Titel
  cardTitle:   { fontSize: 13, fontWeight: 600, color: TEXT },
  cardSubtitle:{ fontSize: 11, color: TEXT_MUTED, marginTop: 3 },

  // Eingabe-Label
  inputLabel:  { fontSize: 11, fontWeight: 500, color: TEXT_MUTED, marginBottom: 5, display: "block" as const },

  // Body
  body:        { fontSize: 13, color: TEXT },
  bodySmall:   { fontSize: 12, color: TEXT_MUTED },
  hint:        { fontSize: 11, color: TEXT_DIM },
} satisfies Record<string, React.CSSProperties>;

/* ── Spacing ─────────────────────────────────────────────────── */
export const S = {
  sectionGap: 16,   // gap zwischen Sektionen
  cardPad:    20,   // padding in Cards
  inputGap:   12,   // gap zwischen Inputs
  headerMB:   28,   // margin-bottom unter Topbar
};

/* ── Components ─────────────────────────────────────────────── */
export const CARD: React.CSSProperties = {
  background: BG_CARD,
  border:     `1px solid ${BORDER}`,
  borderRadius: 16,
  padding:    S.cardPad,
};

export const CARD_INPUT: React.CSSProperties = {
  background:   BG_CARD_INPUT,
  border:       `1px solid ${BORDER_ACCENT}`,
  borderRadius: 16,
  padding:      S.cardPad,
};

export const INPUT: React.CSSProperties = {
  width:        "100%",
  height:       40,
  borderRadius: 10,
  padding:      "0 12px",
  background:   BG_INPUT,
  border:       `1px solid ${BORDER}`,
  color:        TEXT,
  fontSize:     13,
  boxSizing:    "border-box",
  outline:      "none",
};

export const BADGE_EINGABE: React.CSSProperties = {
  fontSize:     10,
  fontWeight:   600,
  padding:      "3px 8px",
  borderRadius: 20,
  background:   "rgba(252,220,69,0.1)",
  color:        YELLOW,
  border:       "1px solid rgba(252,220,69,0.2)",
  letterSpacing:"0.06em",
};

export const SUMMARY_HINT: React.CSSProperties = {
  marginTop:    12,
  padding:      "10px 12px",
  background:   BG_SUBTLE,
  borderRadius: 8,
  fontSize:     11,
  color:        "rgba(255,255,255,0.45)",
};

export const ICON_BOX: React.CSSProperties = {
  width:          44,
  height:         44,
  borderRadius:   12,
  background:     BLUE_DARK,
  display:        "flex",
  alignItems:     "center",
  justifyContent: "center",
  flexShrink:     0,
};

export const SECTION_DIVIDER: React.CSSProperties = {
  flex:       1,
  height:     1,
  background: "rgba(255,255,255,0.06)",
};

/* ── Export Dropdown (dark) ──────────────────────────────────── */
export const EXPORT_BTN: React.CSSProperties = {
  padding:      "7px 14px",
  borderRadius: 9,
  fontSize:     12,
  fontWeight:   500,
  cursor:       "pointer",
  background:   "rgba(255,255,255,0.06)",
  border:       "1px solid rgba(255,255,255,0.09)",
  color:        "rgba(255,255,255,0.7)",
  display:      "inline-flex",
  alignItems:   "center",
  gap:          6,
};

export const EXPORT_DROPDOWN: React.CSSProperties = {
  position:     "absolute",
  right:        0,
  top:          "calc(100% + 6px)",
  width:        220,
  background:   "#161b22",
  border:       "1px solid rgba(255,255,255,0.08)",
  borderRadius: 12,
  padding:      14,
  zIndex:       200,
  boxShadow:    "0 8px 32px rgba(0,0,0,0.5)",
};

/* ── Mode Toggle ─────────────────────────────────────────────── */
export function modeToggleBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding:    "4px 12px",
    borderRadius: 7,
    fontSize:   12,
    fontWeight: 500,
    cursor:     "pointer",
    border:     "none",
    transition: "all 0.15s",
    background: active ? YELLOW : "transparent",
    color:      active ? "#0d1117" : "rgba(255,255,255,0.5)",
  };
}

// Trick: import React type for CSSProperties
import type React from "react";
