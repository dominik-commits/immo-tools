// src/components/AppShell.tsx
// Dunkle Sidebar-Navigation für alle Analyzer-Seiten

import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  Building2,
  Factory,
  Scale,
  Wallet,
  Calculator,
  Percent,
  Landmark,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
} from "lucide-react";
import { SignedIn, UserButton, useUser } from "@clerk/clerk-react";
import { useUserPlan } from "@/hooks/useUserPlan";

/* ── Dark Theme Tokens ─────────────────────────────────────────── */
const BG_SIDEBAR = "#0d1117";
const BG_SIDEBAR_HOVER = "rgba(255,255,255,0.05)";
const BG_ACTIVE = "rgba(252,220,69,0.1)";
const BORDER = "rgba(255,255,255,0.06)";
const TEXT_MUTED = "rgba(255,255,255,0.38)";
const TEXT_DIM = "rgba(255,255,255,0.6)";
const YELLOW = "#FCDC45";

/* ── Nav Items ─────────────────────────────────────────────────── */
type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  plan: "free" | "basis" | "pro";
};

const NAV_ITEMS: NavItem[] = [
  { href: "/wohnung", label: "Wohnungs-Rendite", icon: <HomeIcon size={16} />, plan: "free" },
  { href: "/mfh", label: "Mietshaus-Analyse", icon: <Building2 size={16} />, plan: "basis" },
  { href: "/einfamilienhaus", label: "EFH-Rendite", icon: <Landmark size={16} />, plan: "pro" },
  { href: "/gewerbe", label: "Gewerbe-Rendite", icon: <Factory size={16} />, plan: "pro" },
  { href: "/gemischte-immobilie", label: "Gemischte Immo.", icon: <Landmark size={16} />, plan: "pro" },
];

const TOOL_ITEMS: NavItem[] = [
  { href: "/finanzierung-simpel", label: "Finanzierungsrechner", icon: <Calculator size={16} />, plan: "basis" },
  { href: "/miete", label: "Miet-Kalkulator", icon: <Wallet size={16} />, plan: "basis" },
  { href: "/vergleich", label: "Objekt-Vergleich", icon: <Scale size={16} />, plan: "pro" },
  { href: "/afa", label: "Abschreibungs-Planer", icon: <Percent size={16} />, plan: "pro" },
];

/* ── Plan Badge ─────────────────────────────────────────────────── */
function PlanBadge({ plan }: { plan: "free" | "basis" | "pro" }) {
  if (plan === "free") return null;
  if (plan === "basis") return (
    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)", fontWeight: 600, letterSpacing: "0.06em", border: "1px solid rgba(255,255,255,0.1)" }}>BASIS</span>
  );
  return (
    <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 10, background: "rgba(252,220,69,0.12)", color: YELLOW, fontWeight: 600, letterSpacing: "0.06em" }}>PRO</span>
  );
}

/* ── Sidebar Item ───────────────────────────────────────────────── */
function SidebarItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const isActive = location.pathname === item.href;

  return (
    <NavLink
      to={item.href}
      title={collapsed ? item.label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: collapsed ? "8px 12px" : "8px 10px",
        borderRadius: 8,
        marginBottom: 2,
        fontSize: 13,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? YELLOW : TEXT_DIM,
        background: isActive ? BG_ACTIVE : "transparent",
        border: isActive ? `1px solid rgba(252,220,69,0.15)` : "1px solid transparent",
        textDecoration: "none",
        transition: "all 0.15s",
        justifyContent: collapsed ? "center" : "flex-start",
        whiteSpace: "nowrap",
        overflow: "hidden",
      }}
      onMouseEnter={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = BG_SIDEBAR_HOVER;
      }}
      onMouseLeave={(e) => {
        if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
      {!collapsed && (
        <>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</span>
          <PlanBadge plan={item.plan} />
        </>
      )}
    </NavLink>
  );
}

/* ── Sidebar Section Label ──────────────────────────────────────── */
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div style={{ height: 1, background: BORDER, margin: "10px 8px" }} />;
  return (
    <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_MUTED, padding: "12px 10px 6px" }}>
      {label}
    </div>
  );
}

/* ── AppShell ───────────────────────────────────────────────────── */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useUser();
  const { plan } = useUserPlan();

  const planLabel = plan === "pro" ? "PRO" : plan === "basis" ? "BASIS" : "GAST";
  const initials = user?.firstName?.[0]?.toUpperCase() ?? "?";
  const fullName = user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Gast";

  const sidebarWidth = collapsed ? 56 : 220;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0d1117" }}>
      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          background: "#111318",
          borderRight: `1px solid ${BORDER}`,
          display: "flex",
          flexDirection: "column",
          transition: "width 0.2s ease",
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* Logo */}
        <div style={{ padding: collapsed ? "16px 10px" : "16px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "space-between", gap: 8 }}>
          {!collapsed && (
            <NavLink to="/" style={{ textDecoration: "none" }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: YELLOW, letterSpacing: "-0.5px" }}>PROPORA</div>
              <div style={{ fontSize: 10, color: TEXT_MUTED, marginTop: 1, letterSpacing: "0.08em", textTransform: "uppercase" }}>Immo-Analyzer</div>
            </NavLink>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: 4, cursor: "pointer", color: TEXT_MUTED, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", padding: collapsed ? "8px 4px" : "8px", scrollbarWidth: "none" }}>
          <SectionLabel label="Analyzer" collapsed={collapsed} />
          {NAV_ITEMS.map((item) => (
            <SidebarItem key={item.href} item={item} collapsed={collapsed} />
          ))}
          <SectionLabel label="Tools" collapsed={collapsed} />
          {TOOL_ITEMS.map((item) => (
            <SidebarItem key={item.href} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* User */}
        <div style={{ borderTop: `1px solid ${BORDER}`, padding: collapsed ? "12px 8px" : "12px 14px" }}>
          <SignedIn>
            {collapsed ? (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <UserButton afterSignOutUrl="/login" />
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <UserButton afterSignOutUrl="/login" />
                <div style={{ overflow: "hidden", flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "rgba(255,255,255,0.8)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fullName}</div>
                  <div style={{ fontSize: 10, color: planLabel === "PRO" ? YELLOW : TEXT_MUTED, fontWeight: 600 }}>{planLabel}</div>
                </div>
              </div>
            )}
          </SignedIn>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, overflow: "auto" }}>
        {children}
      </main>
    </div>
  );
}
