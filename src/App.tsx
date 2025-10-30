// src/App.tsx
import React from "react";
import {
  Lock,
  ArrowRight,
  Home as HomeIcon,
  Building2,
  Factory,
  Scale,
  Wallet,
  Calculator,
  Percent,
  Menu,
  X,
} from "lucide-react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";

/* -------------------------------------------------------------
   PROPORA – Dashboard + Header (Plan-aware, Router-ready)
   - Logo: /public/assets/propora-logo.png
   - BASIS: Wohnung, Mehrfamilienhaus, Finanzierung (basis), Miete
   - PRO: Gewerbeimmobilie, Vergleich, AfA, Finanzierung (voll)
--------------------------------------------------------------*/

import Compare from "./routes/Compare";
import Pricing from "./routes/Pricing";
import Checkout from "./routes/Checkout";
import Upgrade from "./routes/Upgrade";

import WohnCheck from "./routes/WohnCheck";
import MFHCheck from "./routes/MFHCheck";
import GewerbeCheck from "./routes/GewerbeCheck";
import AfaRechner from "./routes/AfaRechner";
import Mietkalkulation from "./routes/Mietkalkulation";
import Finanzierung from "./routes/Finanzierung";
import FinanzierungSimple from "./routes/FinanzierungSimple";

// 🔐 Auth & Konto
import { AuthProvider } from "./contexts/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import Konto from "./routes/Konto";
import ResetPassword from "./routes/ResetPassword";

// 🔑 Login-Button (zeigt Login/Logout/Konto je nach Session)
import LoginButton from "./components/LoginButton";

// 🧠 Hook: Plan direkt aus Supabase laden
import { useUserPlan } from "./hooks/useUserPlan";

// 🟦 Login-Seite (klassisches Login vor dem Tool)
import Login from "./routes/Login";

type Plan = "basis" | "pro";

type Module = {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  requiredPlan: Plan | "any";
};

// ---------- Module mit korrekter Plan-Zuteilung ----------
const MODULES: Module[] = [
  // BASIS
  {
    key: "wohnung",
    title: "Wohnung",
    description: "In 60 Sekunden prüfen, ob sich eine Wohnung lohnt.",
    icon: <HomeIcon className="h-5 w-5" />,
    href: "/wohnung",
    requiredPlan: "any",
  },
  {
    key: "mfh",
    title: "Mehrfamilienhaus",
    description: "Mehrere Einheiten grob kalkulieren.",
    icon: <Building2 className="h-5 w-5" />,
    href: "/mfh",
    requiredPlan: "any",
  },
  {
    key: "finanzierung-simpel",
    title: "Finanzierung (basis)",
    description: "Schnellcheck: Annuität, Rate, max. Kaufpreis.",
    icon: <Calculator className="h-5 w-5" />,
    href: "/finanzierung-simpel",
    requiredPlan: "any",
  },
  {
    key: "miete",
    title: "Miete",
    description: "Warm/Kalt, Nebenkosten, Rendite – einfach erklärt.",
    icon: <Wallet className="h-5 w-5" />,
    href: "/miete",
    requiredPlan: "any",
  },

  // PRO
  {
    key: "gewerbe",
    title: "Gewerbeimmobilie",
    description: "Leerstandsrisiko und Sensitivität einschätzen.",
    icon: <Factory className="h-5 w-5" />,
    href: "/gewerbe",
    requiredPlan: "pro",
  },
  {
    key: "vergleich",
    title: "Vergleich",
    description: "Renditen unterschiedlicher Objekte vergleichen.",
    icon: <Scale className="h-5 w-5" />,
    href: "/vergleich",
    requiredPlan: "pro",
  },
  {
    key: "afa",
    title: "AfA",
    description: "Abschreibung (AfA) nach Baujahr & Satz berechnen.",
    icon: <Percent className="h-5 w-5" />,
    href: "/afa",
    requiredPlan: "pro",
  },
  {
    key: "finanzierung",
    title: "Finanzierung",
    description: "Vollversion: DSCR, Szenarien & Details.",
    icon: <Calculator className="h-5 w-5" />,
    href: "/finanzierung",
    requiredPlan: "pro",
  },
];

// ---------- Navigation ----------
const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Wohnung", href: "/wohnung" },
  { label: "Mehrfamilienhaus", href: "/mfh" },
  { label: "Gewerbe", href: "/gewerbe" },
  { label: "Vergleich", href: "/vergleich" },
  { label: "Miete", href: "/miete" },
  { label: "AfA", href: "/afa" },
  { label: "Finanzierung (basis)", href: "/finanzierung-simpel" },
  { label: "Finanzierung", href: "/finanzierung" },
  { label: "Preise", href: "/preise" },
];

// ---------- UI ----------
function ProBadge({ locked }: { locked?: boolean }) {
  return (
    <span
      className={
        "ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium " +
        (locked ? "bg-gray-100 text-gray-600" : "bg-blue-100 text-blue-700")
      }
    >
      {locked ? <Lock className="h-3.5 w-3.5" /> : null}
      PRO
    </span>
  );
}

function Header({ plan }: { plan: Plan }) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4 lg:px-6">
        {/* Logo führt zum Dashboard */}
        <NavLink to="/" className="flex items-center gap-2">
          <img src="/assets/propora-logo.png" alt="PROPORA" className="h-6 w-auto" />
        </NavLink>

        {/* Desktop-Nav */}
        <nav className="hidden md:flex md:items-center md:gap-2">
          {NAV_LINKS.map((n) => (
            <NavLink
              key={n.href}
              to={n.href}
              end={n.href === "/"}
              className={({ isActive }) =>
                "rounded-md px-2.5 py-1.5 text-sm " +
                (isActive ? "bg-[#0F2C8A] text-white" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900")
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        {/* Plan-Badge + Login */}
        <div className="flex items-center gap-2">
          <span className="hidden text-xs font-medium text-gray-600 sm:inline">Plan:</span>
          <span className="hidden rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-700 sm:inline">
            {plan === "pro" ? "PRO" : "BASIS"}
          </span>

          {/* Mobile Menu Toggle */}
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menü öffnen"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Desktop: Login/Konto/Logout */}
          <div className="hidden md:block">
            <LoginButton />
          </div>
        </div>
      </div>

      {/* Mobile-Menü */}
      {open && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <nav className="mx-auto grid max-w-7xl grid-cols-2 gap-1 p-2">
            {NAV_LINKS.map((n) => (
              <NavLink
                key={n.href}
                to={n.href}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  "rounded-md px-3 py-2 text-sm " +
                  (isActive ? "bg-[#0F2C8A] text-white" : "text-gray-700 hover:bg-gray-100")
                }
              >
                {n.label}
              </NavLink>
            ))}
            {/* Mobile: Login/Konto/Logout */}
            <div className="col-span-2 mt-1">
              <LoginButton />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

function ModuleCard({ module, plan }: { module: Module; plan: Plan }) {
  const isLocked = module.requiredPlan === "pro" && plan !== "pro";
  return (
    <div
      className={`group relative flex h-full flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
        isLocked ? "border-gray-200 opacity-90" : "border-gray-200"
      }`}
    >
      <div>
        <div className="mb-2 flex items-center">
          <div className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-50">
            {module.icon}
          </div>
          <h3 className="text-base font-semibold text-gray-900">
            {module.title}
            {module.requiredPlan === "pro" && <ProBadge locked={isLocked} />}
          </h3>
        </div>
        <p className="text-sm leading-6 text-gray-600">{module.description}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {isLocked ? (
          <NavLink
            to="/preise"
            className="inline-flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Jetzt auf PRO upgraden <ArrowRight className="h-4 w-4" />
          </NavLink>
        ) : (
          <NavLink
            to={module.href}
            className="inline-flex items-center gap-1 rounded-lg bg-[#0F2C8A] px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Öffnen <ArrowRight className="h-4 w-4" />
          </NavLink>
        )}
      </div>

      {isLocked && <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-200/60" />}
    </div>
  );
}

function Dashboard({ plan }: { plan: Plan }) {
  return (
    <main className="mx-auto max-w-7xl px-3 pb-14 pt-6 sm:px-4 lg:px-6">
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold tracking-tight text-gray-900">
          Willkommen bei den Immo Analyzern von PROPORA
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Du nutzt aktuell den{" "}
          <span className="font-semibold">PROPORA {plan === "pro" ? "PRO" : "Basis"}-Plan</span>.
          Verfügbar sind alle Module ohne Schloss. PRO-Module sind gekennzeichnet.
        </p>
      </section>

      <section>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <ModuleCard key={m.key} module={m} plan={plan} />
          ))}
        </div>

        <p className="mt-6 text-xs text-gray-500">
          Hinweis: Vereinfachtes Modell zu Lernzwecken. Keine Steuer-/Rechtsberatung.
        </p>
      </section>
    </main>
  );
}

function AppInner() {
  const planFromDb = useUserPlan();
  const plan: Plan = planFromDb ?? ((window as any)?.__PLAN__ ?? "basis");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header plan={plan} />
      <Routes>
        <Route path="/" element={<Dashboard plan={plan} />} />
        {/* BASIS */}
        <Route path="/wohnung" element={<WohnCheck />} />
        <Route path="/mfh" element={<MFHCheck />} />
        <Route path="/finanzierung-simpel" element={<FinanzierungSimple />} />
        <Route path="/miete" element={<Mietkalkulation />} />
        {/* PRO */}
        <Route path="/gewerbe" element={<GewerbeCheck />} />
        <Route path="/vergleich" element={<Compare />} />
        <Route path="/afa" element={<AfaRechner />} />
        <Route path="/finanzierung" element={<Finanzierung />} />
        {/* Sonstiges */}
        <Route path="/preise" element={<Pricing />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/upgrade" element={<Upgrade />} />
        {/* 🔐 Login (klassisch) */}
        <Route path="/login" element={<Login />} />
		<Route path="/reset" element={<ResetPassword />} />
        {/* Geschützt: Konto */}
        <Route
          path="/konto"
          element={
            <ProtectedRoute>
              <Konto />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
