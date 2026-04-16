// src/App.tsx
import React, { lazy, Suspense } from "react";
import {
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
  Landmark,
} from "lucide-react";
import { Routes, Route, NavLink, Navigate, useLocation } from "react-router-dom";
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/clerk-react";

// Auth-Routen (Code-Splitting)
const Login = lazy(() => import("./routes/auth/Login"));
const Register = lazy(() => import("./routes/auth/Register"));
const Logout = lazy(() => import("./routes/auth/Logout"));
const Account = lazy(() => import("./routes/auth/Account"));

// Analyzer & Seiten
import Compare from "./routes/Compare";
import Pricing from "./routes/Pricing";
import Checkout from "./routes/Checkout";
import Upgrade from "./routes/Upgrade";
import Eigentumswohnung from "./routes/Eigentumswohnung";
import MFHCheck from "./routes/MFHCheck";
import Einfamilienhaus from "./routes/EinfamilienhausCheck";
import MixedUseCheck from "./routes/MixedUseCheck";
import GewerbeCheck from "./routes/GewerbeCheck";
import AfaRechner from "./routes/AfaRechner";
import Mietkalkulation from "./routes/Mietkalkulation";
import Finanzierung from "./routes/Finanzierung";
import FinanzierungSimple from "./routes/FinanzierungSimple";

// Plan-Resolver (Clerk + Supabase)
import { useUserPlan, type UserPlan } from "./hooks/useUserPlan";

// UI
import AnalyzerMegaMenu from "./components/AnalyzerMegaMenu";
import AuthProbe from "./routes/AuthProbe";
import AppShell from "./components/AppShell";

// -------------------------------------------------------------
// Konstanten & Typen
// -------------------------------------------------------------
const PRICING_HREF = "/preise";

type Plan = "basis" | "pro";

export type Module = {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  /**
   * requiredPlan:
   *  - "any"   → kostenlos (Wohnung, aber nur nach Login)
   *  - "basis" → Basis-Plan oder Pro-Plan nötig
   *  - "pro"   → nur Pro-Plan
   */
  requiredPlan: Plan | "any";
};

// -------------------------------------------------------------
// Nach Checkout Plan sofort sichtbar machen
// -------------------------------------------------------------
function CheckoutRefresh() {
  const location = useLocation();

  React.useEffect(() => {
    const qp = new URLSearchParams(location.search);
    if (qp.get("checkout") === "success") {
      qp.delete("checkout");
      const s = qp.toString();
      const cleanUrl = `${location.pathname}${s ? `?${s}` : ""}`;
      window.history.replaceState({}, "", cleanUrl);
      setTimeout(() => window.location.reload(), 50);
    }
  }, [location.pathname, location.search]);

  return null;
}

// -------------------------------------------------------------
// Module
// -------------------------------------------------------------
const IcoWohnung = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 9L10 3L17 9V17H13V13H7V17H3V9Z" stroke="#FCDC45" strokeWidth="1.5" strokeLinejoin="round"/><circle cx="10" cy="11" r="1.5" fill="#FCDC45"/></svg>;
const IcoMFH = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="7" width="14" height="10" stroke="#FCDC45" strokeWidth="1.5" fill="none" rx="1"/><path d="M1 8L10 2L19 8" stroke="#FCDC45" strokeWidth="1.5" strokeLinecap="round"/><rect x="6" y="11" width="2.5" height="2.5" fill="#FCDC45" rx="0.5"/><rect x="11.5" y="11" width="2.5" height="2.5" fill="#FCDC45" rx="0.5"/><rect x="8.75" y="14" width="2.5" height="3" fill="#FCDC45" rx="0.5"/></svg>;
const IcoEFH = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M2 9L10 2L18 9V18H13.5V13.5H6.5V18H2V9Z" stroke="#FCDC45" strokeWidth="1.5" strokeLinejoin="round"/><rect x="8" y="14.5" width="4" height="3.5" fill="#FCDC45" rx="0.5"/><path d="M13 5V3H15V7" stroke="#FCDC45" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcoGewerbe = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="13" stroke="#FCDC45" strokeWidth="1.5" fill="none" rx="1"/><path d="M2 9H18" stroke="#FCDC45" strokeWidth="1" opacity="0.5"/><rect x="5" y="7" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/><rect x="9" y="7" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/><rect x="13" y="7" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/><rect x="5" y="11" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/><rect x="9" y="11" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/><rect x="13" y="11" width="2" height="1.5" fill="#FCDC45" rx="0.3" opacity="0.7"/><rect x="7" y="14.5" width="6" height="3.5" fill="#FCDC45" rx="0.5"/><path d="M6 5V3H14V5" stroke="#FCDC45" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const IcoMixed = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="9" width="7" height="9" stroke="#FCDC45" strokeWidth="1.5" fill="none" rx="1"/><path d="M9 10L14 5L19 10V18H9V10Z" stroke="#FCDC45" strokeWidth="1.5" strokeLinejoin="round" fill="none"/><rect x="4" y="13" width="1.5" height="2" fill="#FCDC45" rx="0.3"/><rect x="6.5" y="13" width="1.5" height="2" fill="#FCDC45" rx="0.3"/><rect x="12" y="13" width="1.5" height="2" fill="#FCDC45" rx="0.3"/></svg>;
const IcoFinanzierung = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" stroke="#FCDC45" strokeWidth="1.5" fill="none" rx="2"/><path d="M10 7V5M10 13V15" stroke="#FCDC45" strokeWidth="1.3" strokeLinecap="round"/><path d="M7 10C7 8.9 8.34 8 10 8C11.66 8 13 8.9 13 10C13 11.1 11.66 12 10 12C8.34 12 7 11.1 7 10Z" stroke="#FCDC45" strokeWidth="1.3" fill="none"/></svg>;
const IcoMiete = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="3" y="2" width="14" height="16" stroke="#FCDC45" strokeWidth="1.5" fill="none" rx="1.5"/><path d="M7 7H13M7 10H13M7 13H10" stroke="#FCDC45" strokeWidth="1.3" strokeLinecap="round"/><circle cx="13" cy="13" r="2" fill="#FCDC45"/><path d="M12.5 13H13.5M13 12.5V13.5" stroke="#1b2c47" strokeWidth="1" strokeLinecap="round"/></svg>;
const IcoVergleich = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="6" width="7" height="10" stroke="#FCDC45" strokeWidth="1.5" fill="none" rx="1"/><rect x="11" y="4" width="7" height="12" stroke="#FCDC45" strokeWidth="1.5" fill="none" rx="1"/><path d="M9 11H11" stroke="#FCDC45" strokeWidth="1.3" strokeLinecap="round"/><path d="M9.5 9.5L11 11L9.5 12.5" stroke="#FCDC45" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const IcoAfa = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 14L7 9L10 11L14 6L17 8" stroke="#FCDC45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/><path d="M3 16L7 13L10 14.5L14 10L17 12" stroke="#FCDC45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 18H17" stroke="#FCDC45" strokeWidth="1" opacity="0.3"/></svg>;

const MODULES: Module[] = [
  {
    key: "wohnung",
    title: "Wohnungs-Rendite",
    description: "Kaufpreis, Miete & Finanzierung – sofort sehen ob sich die Wohnung lohnt.",
    icon: <IcoWohnung />,
    href: "/wohnung",
    requiredPlan: "any",
  },
  {
    key: "mfh",
    title: "Mietshaus-Analyse",
    description: "Mehrfamilienhaus kalkulieren: NOI, Cashflow, DSCR und Rendite.",
    icon: <IcoMFH />,
    href: "/mfh",
    requiredPlan: "basis",
  },
  {
    key: "finanzierung-simpel",
    title: "Finanzierungsrechner",
    description: "Monatsrate, Zinsen und Restschuld – wenige Eingaben, klares Ergebnis.",
    icon: <IcoFinanzierung />,
    href: "/finanzierung-simpel",
    requiredPlan: "basis",
  },
  {
    key: "miete",
    title: "Miet-Kalkulator",
    description: "Warmmiete, Umlagen & NOI auf einen Blick – mit 10-Jahres-Projektion.",
    icon: <IcoMiete />,
    href: "/miete",
    requiredPlan: "basis",
  },
  // PRO
  {
    key: "einfamilienhaus",
    title: "Einfamilienhaus-Rendite",
    description: "Kapitalanlage EFH: Cashflow, DSCR und Nettomietrendite.",
    icon: <IcoEFH />,
    href: "/einfamilienhaus",
    requiredPlan: "pro",
  },
  {
    key: "gemischte-immobilie",
    title: "Gemischte Immobilie",
    description: "Wohnen + Gewerbe kombiniert: NOI, Score und Break-even je Segment.",
    icon: <IcoMixed />,
    href: "/gemischte-immobilie",
    requiredPlan: "pro",
  },
  {
    key: "gewerbe",
    title: "Gewerbe-Rendite",
    description: "Cap-Rate, DSCR und Cashflow für Gewerbeobjekte mit Zonenmodell.",
    icon: <IcoGewerbe />,
    href: "/gewerbe",
    requiredPlan: "pro",
  },
  {
    key: "vergleich",
    title: "Objekt-Vergleich",
    description: "2–5 Immobilien nebeneinander vergleichen – mit PDF-Import.",
    icon: <IcoVergleich />,
    href: "/vergleich",
    requiredPlan: "pro",
  },
  {
    key: "afa",
    title: "Abschreibungs-Planer",
    description: "AfA nach Baujahr, Modernisierungen und Sonder-AfA berechnen.",
    icon: <IcoAfa />,
    href: "/afa",
    requiredPlan: "pro",
  },
  {
    key: "finanzierung",
    title: "Finanzierungs-Analyse",
    description: "Vollversion: DSCR, Szenarien, Tilgungsplan & Stresstest.",
    icon: <IcoFinanzierung />,
    href: "/finanzierung",
    requiredPlan: "pro",
  },
];

// -------------------------------------------------------------
// Branding
// -------------------------------------------------------------
const PRO_BG = "bg-violet-600";
const PRO_BG_SOFT = "bg-violet-50";
const PRO_TEXT = "text-violet-700";

// -------------------------------------------------------------
// Auth-Controls (Login / UserButton)
// -------------------------------------------------------------
function AuthControls() {
  const next =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/";

  return (
    <div className="inline-flex items-center gap-2">
      <SignedOut>
        <NavLink
          to={`/login?next=${encodeURIComponent(next)}`}
          className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
        >
          Anmelden
        </NavLink>
      </SignedOut>

      <SignedIn>
        <UserButton afterSignOutUrl="/login" />
      </SignedIn>
    </div>
  );
}

// -------------------------------------------------------------
// Header
// -------------------------------------------------------------
function Header({
  plan,
  planLabel,
}: {
  plan: Plan;
  planLabel: "BASIS" | "PRO" | "GAST";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-3 sm:px-4 lg:px-6">
        <NavLink to="/" className="flex items-center gap-2">
          <img src="/assets/propora-logo.png" alt="PROPORA" className="h-6 w-auto" />
        </NavLink>

        {/* Desktop */}
        <div className="hidden items-center gap-3 md:flex">
          <AnalyzerMegaMenu plan={plan} modules={MODULES} />
          <span className="text-xs font-medium text-gray-600">Plan:</span>
          <span
            className={
              "rounded-full px-2 py-0.5 text-xs font-semibold " +
              (planLabel === "PRO"
                ? `${PRO_BG} text-white`
                : planLabel === "BASIS"
                ? "bg-gray-100 text-gray-700"
                : "bg-gray-100 text-gray-500")
            }
          >
            {planLabel}
          </span>
          <AuthControls />
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <span
            className={
              "rounded-full px-2 py-0.5 text-xs font-semibold " +
              (planLabel === "PRO"
                ? `${PRO_BG} text-white`
                : planLabel === "BASIS"
                ? "bg-gray-100 text-gray-700"
                : "bg-gray-100 text-gray-500")
            }
          >
            {planLabel}
          </span>
          <button
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-gray-200 bg-white md:hidden">
          <div className="mx-auto max-w-7xl p-2">
            <AnalyzerMegaMenu
              plan={plan}
              modules={MODULES}
              variant="mobile"
              onNavigate={() => setOpen(false)}
            />
            <div className="mt-2">
              <AuthControls />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// -------------------------------------------------------------
// Guards
// -------------------------------------------------------------
function RequireLogin({ children }: { children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded) return <div className="flex h-48 items-center justify-center text-sm text-gray-500">Lade…</div>;
  return isSignedIn ? <>{children}</> : <Navigate to="/login" replace />;
}

function RequirePaid({
  children,
}: {
  hasPaidPlan: boolean;
  children: React.ReactNode;
}) {
  const { isSignedIn, isLoaded } = useUser();
  const { plan, isLoading } = useUserPlan();
  if (!isLoaded || isLoading) return <div className="flex h-48 items-center justify-center text-sm text-gray-500">Lade…</div>;
  if (!isSignedIn) return <Navigate to="/login" replace />;
  if (plan === "free") return <Navigate to="/upgrade" replace />;
  return <>{children}</>;
}

function RequirePro({ children }: { plan: Plan; children: React.ReactNode }) {
  const { isSignedIn, isLoaded } = useUser();
  const { plan, isLoading } = useUserPlan();
  if (!isLoaded || isLoading) return <div className="flex h-48 items-center justify-center text-sm text-gray-500">Lade…</div>;
  if (!isSignedIn) return <Navigate to="/login" replace />;
  if (plan !== "pro") return <Navigate to="/upgrade" replace />;
  return <>{children}</>;
}

// -------------------------------------------------------------
// Module Card
// -------------------------------------------------------------
function ModuleCard({
  module,
  plan,
  isSignedIn,
  hasPaidPlan,
}: {
  module: Module;
  plan: Plan;
  isSignedIn: boolean;
  hasPaidPlan: boolean;
}) {
  const isPro = module.requiredPlan === "pro";
  const isFree = module.requiredPlan === "any";
  const isBasis = module.requiredPlan === "basis";

  const lockedForSignedIn =
    isPro ? plan !== "pro" : isBasis ? !hasPaidPlan : false;

  const locked = isSignedIn ? lockedForSignedIn : false;

  // CTA-Logik
  let ctaLabel = "Öffnen";
  let ctaHref = module.href;
  let ctaExternal = false;

  if (!isSignedIn) {
    if (isFree) {
      ctaLabel = "Kostenlos starten";
      ctaHref = `/register?next=${encodeURIComponent(module.href)}`;
    } else if (isBasis) {
      ctaLabel = "Basic freischalten";
      ctaHref = PRICING_HREF;
    } else if (isPro) {
      ctaLabel = "Pro freischalten";
      ctaHref = PRICING_HREF;
    }
  } else {
    if (isPro && plan !== "pro") {
      ctaLabel = "Jetzt auf PRO upgraden";
      ctaHref = PRICING_HREF;
    } else if (isBasis && !hasPaidPlan) {
      ctaLabel = "Jetzt Basic freischalten";
      ctaHref = PRICING_HREF;
    } else {
      ctaLabel = "Öffnen";
      ctaHref = module.href;
    }
  }

  const btnClass = isPro
    ? `inline-flex items-center gap-1 rounded-lg ${PRO_BG} px-3 py-2 text-sm font-semibold text-white hover:brightness-110`
    : "inline-flex items-center gap-1 rounded-lg bg-[#0F2C8A] px-3 py-2 text-sm font-semibold text-white hover:brightness-110";

  return (
    <div style={{
      position: "relative", display: "flex", flexDirection: "column", justifyContent: "space-between",
      height: "100%", borderRadius: 16, padding: 20,
      background: "rgba(22,27,34,0.9)",
      border: `1px solid ${locked ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.08)"}`,
      opacity: locked ? 0.7 : 1,
      transition: "all 0.15s",
    }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#1b2c47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {module.icon}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.88)", margin: 0 }}>{module.title}</h3>
            {isPro && (
              <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(252,220,69,0.12)", color: "#FCDC45", border: "1px solid rgba(252,220,69,0.25)", fontWeight: 600 }}>PRO</span>
            )}
          </div>
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", lineHeight: 1.5, margin: 0 }}>{module.description}</p>
      </div>

      <div style={{ marginTop: 16 }}>
        {ctaExternal ? (
          <a href={ctaHref} target="_blank" rel="noopener noreferrer"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: isPro ? "#FCDC45" : "#FCDC45", color: "#111", textDecoration: "none", border: "none" }}>
            {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
          </a>
        ) : (
          <NavLink to={ctaHref}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, fontSize: 12, fontWeight: 600, background: "#FCDC45", color: "#111", textDecoration: "none" }}>
            {ctaLabel} <ArrowRight className="h-3.5 w-3.5" />
          </NavLink>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// Dashboard
// -------------------------------------------------------------
function Dashboard({ plan, hasPaidPlan }: { plan: Plan; hasPaidPlan: boolean }) {
  const { isSignedIn } = useUser();
  const basis = MODULES.filter((m) => m.requiredPlan !== "pro");
  const pros = MODULES.filter((m) => m.requiredPlan === "pro");

  return (
    <main style={{ minHeight: "100vh", background: "#0d1117", color: "#e6edf3" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 60px" }}>
        {/* Hero */}
        <div style={{ marginBottom: 32, padding: "24px 28px", background: "rgba(22,27,34,0.9)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#e6edf3", margin: "0 0 6px", letterSpacing: "-0.3px" }}>
            Immobilien-Analyzer
          </h1>
          {!isSignedIn ? (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>
              Melde dich an oder registriere dich kostenlos, um den <b style={{ color: "#FCDC45" }}>Wohnungs-Rendite</b>-Analyzer zu nutzen.
            </p>
          ) : hasPaidPlan ? (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>
              Du nutzt aktuell den <b style={{ color: "#FCDC45" }}>PROPORA {plan === "pro" ? "PRO" : "Basis"}-Plan</b>.
            </p>
          ) : (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>
              Du bist eingeloggt und kannst den <b style={{ color: "#FCDC45" }}>Wohnungs-Rendite</b>-Analyzer kostenlos nutzen.{" "}
              <NavLink to={PRICING_HREF} style={{ color: "#FCDC45", textDecoration: "underline" }}>Plan upgraden →</NavLink>
            </p>
          )}
        </div>

        {/* Basis */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>Basis-Analyzer</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {basis.map((m) => (
              <ModuleCard key={m.key} module={m} plan={plan} isSignedIn={!!isSignedIn} hasPaidPlan={hasPaidPlan} />
            ))}
          </div>
        </div>

        {/* PRO */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.3)" }}>PRO-Analyzer</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pros.map((m) => (
              <ModuleCard key={m.key} module={m} plan={plan} isSignedIn={!!isSignedIn} hasPaidPlan={hasPaidPlan} />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

// -------------------------------------------------------------
// App
// -------------------------------------------------------------
function AppInner() {
  const { isSignedIn } = useUser();
  const location = useLocation();

  const { plan: userPlan } = useUserPlan();
  const hasPaidPlan = userPlan === "basis" || userPlan === "pro";

  const plan: Plan = userPlan === "pro" ? "pro" : "basis";

  const planLabel: "BASIS" | "PRO" | "GAST" =
    !isSignedIn
      ? "GAST"
      : !hasPaidPlan
      ? "GAST"
      : plan === "pro"
      ? "PRO"
      : "BASIS";

  // Header auf AppShell- und Auth-Routen ausblenden
  const hideHeader =
    location.pathname.startsWith("/preise") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/logout") ||
    location.pathname.startsWith("/account") ||
    location.pathname.startsWith("/finanzierung-simpel") ||
    location.pathname.startsWith("/finanzierung") ||
    location.pathname.startsWith("/vergleich") ||
    location.pathname.startsWith("/afa") ||
    location.pathname.startsWith("/wohnung") ||
    location.pathname.startsWith("/mfh") ||
    location.pathname.startsWith("/einfamilienhaus") ||
    location.pathname.startsWith("/gemischte-immobilie") ||
    location.pathname.startsWith("/gewerbe") ||
    location.pathname.startsWith("/miete");

  return (
    <div className="min-h-screen bg-gray-50">
      <CheckoutRefresh />
      {!hideHeader && <Header plan={plan} planLabel={planLabel} />}

      <Suspense fallback={<div className="p-6">Lade…</div>}>
        <Routes>
          <Route path="/" element={<Dashboard plan={plan} hasPaidPlan={hasPaidPlan} />} />

          {/* Analyzer – Wohnung: kostenlos, aber Login nötig */}
          <Route
            path="/wohnung"
            element={
              <RequireLogin>
                <AppShell>
                  <Eigentumswohnung />
                </AppShell>
              </RequireLogin>
            }
          />

          {/* Analyzer – Basis: Login + zahlender Plan */}
          <Route
            path="/mfh"
            element={
              <RequirePaid hasPaidPlan={hasPaidPlan}>
                <AppShell>
                  <MFHCheck />
                </AppShell>
              </RequirePaid>
            }
          />
          <Route
            path="/miete"
            element={
              <RequirePaid hasPaidPlan={hasPaidPlan}>
                <AppShell>
                  <Mietkalkulation />
                </AppShell>
              </RequirePaid>
            }
          />
          <Route
            path="/finanzierung-simpel"
            element={
              <AppShell>
                <FinanzierungSimple />
              </AppShell>
            }
          />

          {/* Analyzer – PRO (mit Guard) */}
          <Route
            path="/einfamilienhaus"
            element={
              <RequirePro plan={plan}>
                <AppShell>
                  <Einfamilienhaus />
                </AppShell>
              </RequirePro>
            }
          />
          <Route
            path="/gemischte-immobilie"
            element={
              <RequirePro plan={plan}>
                <AppShell>
                  <MixedUseCheck />
                </AppShell>
              </RequirePro>
            }
          />
          <Route path="/mixed-use" element={<Navigate to="/gemischte-immobilie" replace />} />
          <Route
            path="/gewerbe"
            element={
              <RequirePro plan={plan}>
                <AppShell>
                  <GewerbeCheck />
                </AppShell>
              </RequirePro>
            }
          />
          <Route
            path="/vergleich"
            element={
              <RequirePro plan={plan}>
                <AppShell>
                  <Compare />
                </AppShell>
              </RequirePro>
            }
          />
          <Route
            path="/afa"
            element={
              <RequirePro plan={plan}>
                <AppShell>
                  <AfaRechner />
                </AppShell>
              </RequirePro>
            }
          />
          <Route
            path="/finanzierung"
            element={
              <RequirePro plan={plan}>
                <AppShell>
                  <Finanzierung />
                </AppShell>
              </RequirePro>
            }
          />

          {/* Pricing / Checkout / Upgrade */}
          <Route path="/preise" element={<Pricing />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/upgrade" element={<Upgrade />} />

          {/* Clerk-Auth-Bereich */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/logout" element={<Logout />} />
          <Route path="/account" element={<Account />} />

          {/* Diagnose */}
          <Route path="/authprobe" element={<AuthProbe />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

export default function App() {
  return <AppInner />;
}
