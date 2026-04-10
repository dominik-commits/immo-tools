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
import AppShell from "./components/AppShell";
import AuthProbe from "./routes/AuthProbe";

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
const MODULES: Module[] = [
  {
    key: "wohnung",
    title: "Wohnung",
    description: "In 60 Sekunden prüfen, ob sich eine Wohnung lohnt.",
    icon: <HomeIcon className="h-5 w-5" />,
    href: "/wohnung",
    requiredPlan: "any", // kostenlos, aber Login nötig
  },
  {
    key: "mfh",
    title: "Mehrfamilienhaus",
    description: "Mehrere Einheiten grob kalkulieren.",
    icon: <Building2 className="h-5 w-5" />,
    href: "/mfh",
    requiredPlan: "basis", // Basis oder Pro
  },
  {
    key: "finanzierung-simpel",
    title: "Finanzierung (Basis)",
    description: "Schnellcheck: Annuität, Rate, max. Kaufpreis.",
    icon: <Calculator className="h-5 w-5" />,
    href: "/finanzierung-simpel",
    requiredPlan: "basis", // Basis oder Pro
  },
  {
    key: "miete",
    title: "Miete",
    description: "Warm/Kalt, Nebenkosten, Rendite – einfach erklärt.",
    icon: <Wallet className="h-5 w-5" />,
    href: "/miete",
    requiredPlan: "basis", // Basis oder Pro
  },
  // PRO
  {
    key: "einfamilienhaus",
    title: "Einfamilienhaus",
    description: "Kapitalanlage: Cashflow, DSCR, CoC.",
    icon: <Landmark className="h-5 w-5" />,
    href: "/einfamilienhaus",
    requiredPlan: "pro",
  },
  {
    key: "gemischte-immobilie",
    title: "Gemischte Immobilie",
    description: "Wohnen + Gewerbe: Score, Break-even, Projektion.",
    icon: <Landmark className="h-5 w-5" />,
    href: "/gemischte-immobilie",
    requiredPlan: "pro",
  },
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
      // Kostenloser Analyzer → Registrierung
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
    // Eingeloggt
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
    <div
      className={`group relative flex h-full flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
        locked ? "border-gray-200 opacity-90" : "border-gray-200"
      }`}
    >
      <div>
        <div className="mb-2 flex items-center">
          <div className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-gray-50">
            {module.icon}
          </div>
          <h3 className="flex items-center text-base font-semibold text-gray-900">
            {module.title}
            {isPro && (
              <span
                className={`${PRO_BG_SOFT} ${PRO_TEXT} ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-violet-200`}
                style={{ boxShadow: "inset 0 0 0 1px rgba(124,58,237,0.10)" }}
                aria-label="PRO-Modul"
              >
                PRO
              </span>
            )}
          </h3>
        </div>
        <p className="text-sm leading-6 text-gray-600">{module.description}</p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        {ctaExternal ? (
          <a href={ctaHref} target="_blank" rel="noopener noreferrer" className={btnClass}>
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </a>
        ) : (
          <NavLink to={ctaHref} className={btnClass}>
            {ctaLabel} <ArrowRight className="h-4 w-4" />
          </NavLink>
        )}
      </div>

      {locked && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-200/60" />
      )}
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
    <main className="mx-auto max-w-7xl px-3 pb-14 pt-6 sm:px-4 lg:px-6">
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">Willkommen bei den Immo Analyzern von PROPORA</h1>
        {!isSignedIn ? (
          <p className="mt-1 text-sm text-gray-600">
            Melde dich an oder registriere dich kostenlos, um den{" "}
            <b>Wohnungs-Analyzer</b> zu nutzen. Alle weiteren Analyzer kannst du jederzeit
            über einen Basis- oder Pro-Plan freischalten.
          </p>
        ) : hasPaidPlan ? (
          <p className="mt-1 text-sm text-gray-600">
            Du nutzt aktuell den <b>PROPORA {plan === "pro" ? "PRO" : "Basis"}-Plan</b>.
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-600">
            Du bist eingeloggt und kannst den <b>Wohnungs-Analyzer</b> kostenlos nutzen.
            Für alle weiteren Analyzer wähle deinen Plan unter{" "}
            <NavLink to={PRICING_HREF} className="underline">
              Preise
            </NavLink>
            .
          </p>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Basis-Analyzer</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {basis.map((m) => (
            <ModuleCard
              key={m.key}
              module={m}
              plan={plan}
              isSignedIn={!!isSignedIn}
              hasPaidPlan={hasPaidPlan}
            />
          ))}
        </div>
      </section>

      <section className="mb-2">
        <h2 className="mb-3 text-lg font-semibold">PRO-Analyzer</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pros.map((m) => (
            <ModuleCard
              key={m.key}
              module={m}
              plan={plan}
              isSignedIn={!!isSignedIn}
              hasPaidPlan={hasPaidPlan}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

// -------------------------------------------------------------
// App
// -------------------------------------------------------------
function AppInner() {
  const { isSignedIn } = useUser();
  const location = useLocation();

  // Kann "basis" | "pro" | null liefern (je nach Hook-Implementierung)
  const { plan: userPlan } = useUserPlan();
  const hasPaidPlan = userPlan === "basis" || userPlan === "pro";

  // Für PRO-Gating: wenn nichts gesetzt, verhalten wir uns wie "basis"
  const plan: Plan = userPlan === "pro" ? "pro" : "basis";

  // NEU – Free-User werden NICHT als BASIS angezeigt
  const planLabel: "BASIS" | "PRO" | "GAST" =
    !isSignedIn
      ? "GAST"
      : !hasPaidPlan
      ? "GAST"
      : plan === "pro"
      ? "PRO"
      : "BASIS";

  // Header auf Auth-Routen ausblenden
  const hideHeader =
    location.pathname.startsWith("/preise") ||
    location.pathname.startsWith("/login") ||
    location.pathname.startsWith("/register") ||
    location.pathname.startsWith("/logout") ||
    location.pathname.startsWith("/account");

  const isAnalyzerRoute =
    location.pathname.startsWith("/wohnung") ||
    location.pathname.startsWith("/mfh") ||
    location.pathname.startsWith("/einfamilienhaus") ||
    location.pathname.startsWith("/gewerbe") ||
    location.pathname.startsWith("/gemischte-immobilie") ||
    location.pathname.startsWith("/mixed-use") ||
    location.pathname.startsWith("/vergleich") ||
    location.pathname.startsWith("/afa") ||
    location.pathname.startsWith("/finanzierung") ||
    location.pathname.startsWith("/miete");

  return (
    <div className="min-h-screen bg-gray-50">
      <CheckoutRefresh />
      {!hideHeader && !isAnalyzerRoute && <Header plan={plan} planLabel={planLabel} />}

      <Suspense fallback={<div className="p-6">Lade…</div>}>
        <Routes>
          <Route path="/" element={<Dashboard plan={plan} hasPaidPlan={hasPaidPlan} />} />

          {/* Analyzer – Wohnung: kostenlos, aber Login nötig */}
          <Route
            path="/wohnung"
            element={
              <AppShell><RequireLogin><Eigentumswohnung /></RequireLogin></AppShell>
            }
          />

          {/* Analyzer – Basis: Login + zahlender Plan */}
          <Route
            path="/mfh"
            element={
              <AppShell><RequirePaid hasPaidPlan={hasPaidPlan}><MFHCheck /></RequirePaid></AppShell>
            }
          />
          <Route
            path="/miete"
            element={
              <AppShell><RequirePaid hasPaidPlan={hasPaidPlan}><Mietkalkulation /></RequirePaid></AppShell>
            }
          />
          <Route
            path="/finanzierung-simpel"
            element={
              <AppShell><RequirePaid hasPaidPlan={hasPaidPlan}><FinanzierungSimple /></RequirePaid></AppShell>
            }
          />

          {/* Analyzer – PRO (mit Guard) */}
          <Route
            path="/einfamilienhaus"
            element={
              <AppShell><RequirePro plan={plan}><Einfamilienhaus /></RequirePro></AppShell>
            }
          />
          <Route
            path="/gemischte-immobilie"
            element={
              <AppShell><RequirePro plan={plan}><MixedUseCheck /></RequirePro></AppShell>
            }
          />
          <Route path="/mixed-use" element={<Navigate to="/gemischte-immobilie" replace />} />
          <Route
            path="/gewerbe"
            element={
              <AppShell><RequirePro plan={plan}><GewerbeCheck /></RequirePro></AppShell>
            }
          />
          <Route
            path="/vergleich"
            element={
              <AppShell><RequirePro plan={plan}><Compare /></RequirePro></AppShell>
            }
          />
          <Route
            path="/afa"
            element={
              <AppShell><RequirePro plan={plan}><AfaRechner /></RequirePro></AppShell>
            }
          />
          <Route
            path="/finanzierung"
            element={
              <AppShell><RequirePro plan={plan}><Finanzierung /></RequirePro></AppShell>
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
