// src/App.tsx
import React from "react";
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

/* -------------------------------------------------------------
   PROPORA – App Shell (Plan-aware, Router-ready)
   - Login/Logout als reguläre Routen in dieser App
   - Auth-Flow erweitert um /auth/callback + Reset/Update-PW
--------------------------------------------------------------*/

// Routen (Analyzer & Seiten)
import Compare from "./routes/Compare";
import Pricing from "./routes/Pricing";
import Checkout from "./routes/Checkout";
import Upgrade from "./routes/Upgrade";
import Logout from "./routes/Logout";
import WohnCheck from "./routes/WohnCheck";
import MFHCheck from "./routes/MFHCheck";
import Einfamilienhaus from "./routes/EinfamilienhausCheck";
import MixedUseCheck from "./routes/MixedUseCheck";
import GewerbeCheck from "./routes/GewerbeCheck";
import AfaRechner from "./routes/AfaRechner";
import Mietkalkulation from "./routes/Mietkalkulation";
import Finanzierung from "./routes/Finanzierung";
import FinanzierungSimple from "./routes/FinanzierungSimple";
import Login from "./routes/Login";

// 🔐 Auth-Context (nur lesend)
import AuthProvider, { useAuth } from "./contexts/AuthProvider";

// 🧠 Plan-Resolver
import { useUserPlan } from "./hooks/useUserPlan";

// 🔽 Mega Dropdown
import AnalyzerMegaMenu from "./components/AnalyzerMegaMenu";

// 🧩 Diagnose-Route
import AuthProbe from "./routes/AuthProbe";
// Konto-Seite (lesend)
import Konto from "./routes/Konto";

/* 🔐 Neue Auth-Routen für Supabase v2 Flows */
import AuthCallback from "./routes/AuthCallback";       // /auth/callback für Magic-Link/OAuth/Recovery
import ResetPassword from "./routes/ResetPassword";     // /reset-password E-Mail anstoßen
import UpdatePassword from "./routes/UpdatePassword";   // /update-password neues PW setzen

/** Externe Preise-URL erlauben (optional) */
const PRICING_HREF =
  (typeof window !== "undefined" && (window as any)?.__PRICING_URL__) || "/preise";

type Plan = "basis" | "pro";

export type Module = {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  requiredPlan: Plan | "any";
};

/* -------------------------------------------------------------
   🔁 Nach Checkout Plan sofort sichtbar machen
--------------------------------------------------------------*/
function CheckoutRefresh() {
  const location = useLocation();
  React.useEffect(() => {
    const qp = new URLSearchParams(location.search);
    if (qp.get("checkout") === "success") {
      const cleanUrl = `${location.pathname}${
        qp.has("checkout")
          ? (() => {
              qp.delete("checkout");
              const s = qp.toString();
              return s ? `?${s}` : "";
            })()
          : location.search
      }`;
      window.history.replaceState({}, "", cleanUrl);
      setTimeout(() => window.location.reload(), 50);
    }
  }, [location.pathname, location.search]);
  return null;
}

/* ---------- Module ---------- */
const MODULES: Module[] = [
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
    key: "einfamilienhaus",
    title: "Einfamilienhaus",
    description: "Kapitalanlage: Cashflow, DSCR, CoC.",
    icon: <Landmark className="h-5 w-5" />,
    href: "/einfamilienhaus",
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

/* ---------- PRO-Branding ---------- */
const PRO_BG = "bg-violet-600";
const PRO_BG_SOFT = "bg-violet-50";
const PRO_TEXT = "text-violet-700";

/* ---------- Auth-Controls ---------- */
function AuthControls() {
  const { session } = useAuth();
  const isLoggedIn = !!session;

  if (!isLoggedIn) {
    const next =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/";
    return (
      <NavLink
        to={`/login?next=${encodeURIComponent(next)}`}
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Anmelden
      </NavLink>
    );
  }

  return (
    <div className="inline-flex items-center gap-2">
      <NavLink
        to="/konto"
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Konto
      </NavLink>
      <NavLink
        to="/logout"
        className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-gray-50"
      >
        Abmelden
      </NavLink>
    </div>
  );
}

/* ---------- Header ---------- */
function Header({ plan, planLabel }: { plan: Plan; planLabel: "BASIS" | "PRO" | "GAST" }) {
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

function ModuleCard({
  module,
  plan,
  isLoggedIn,
}: {
  module: Module;
  plan: Plan;
  isLoggedIn: boolean;
}) {
  const isPro = module.requiredPlan === "pro";
  const isLocked = isPro && plan !== "pro";

  // CTA-Logik
  const cta = !isLoggedIn
    ? { label: "Zugang kaufen", href: PRICING_HREF, external: PRICING_HREF.startsWith("http") }
    : isLocked
    ? { label: "Jetzt auf PRO upgraden", href: PRICING_HREF, external: PRICING_HREF.startsWith("http") }
    : { label: "Öffnen", href: module.href, external: false };

  // Button-Farben
  const btnClass = isPro
    ? `inline-flex items-center gap-1 rounded-lg ${PRO_BG} px-3 py-2 text-sm font-semibold text-white hover:brightness-110`
    : "inline-flex items-center gap-1 rounded-lg bg-[#0F2C8A] px-3 py-2 text-sm font-semibold text-white hover:brightness-110";

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
          <h3 className="flex items-center text-base font-semibold text-gray-900">
            {module.title}
            {isPro && (
              <span
                className={`ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${PRO_BG_SOFT} ${PRO_TEXT} ring-1 ring-violet-200`}
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
        {cta.external ? (
          <a href={cta.href} target="_blank" rel="noopener noreferrer" className={btnClass}>
            {cta.label} <ArrowRight className="h-4 w-4" />
          </a>
        ) : (
          <NavLink to={cta.href} className={btnClass}>
            {cta.label} <ArrowRight className="h-4 w-4" />
          </NavLink>
        )}
      </div>

      {isLocked && (
        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-gray-200/60" />
      )}
    </div>
  );
}

/* ---------- Dashboard ---------- */
function Dashboard({ plan }: { plan: Plan }) {
  const { session } = useAuth();
  const isLoggedIn = !!session;
  const basis = MODULES.filter((m) => m.requiredPlan !== "pro");
  const pros = MODULES.filter((m) => m.requiredPlan === "pro");
  return (
    <main className="mx-auto max-w-7xl px-3 pb-14 pt-6 sm:px-4 lg:px-6">
      <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h1 className="text-xl font-bold">Willkommen bei den Immo Analyzern von PROPORA</h1>
        <p className="mt-1 text-sm text-gray-600">
          Du nutzt aktuell den <b>PROPORA {plan === "pro" ? "PRO" : "Basis"}-Plan</b>.
        </p>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-lg font-semibold">Basis-Analyzer</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {basis.map((m) => (
            <ModuleCard key={m.key} module={m} plan={plan} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      </section>

      <section className="mb-2">
        <h2 className="mb-3 text-lg font-semibold">PRO-Analyzer</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pros.map((m) => (
            <ModuleCard key={m.key} module={m} plan={plan} isLoggedIn={isLoggedIn} />
          ))}
        </div>
      </section>
    </main>
  );
}

/* ---------- App ---------- */
function AppInner() {
  const { session } = useAuth();
  const planFromDb = useUserPlan();
  const plan: Plan = planFromDb ?? ((window as any)?.__PLAN__ ?? "basis");
  const planLabel: "BASIS" | "PRO" | "GAST" = !session ? "GAST" : plan === "pro" ? "PRO" : "BASIS";
  const location = useLocation();

  // Header nur auf Preisseite ausblenden
  const hideHeader = location.pathname.startsWith("/preise");

  return (
    <div className="min-h-screen bg-gray-50">
      <CheckoutRefresh />
      {!hideHeader && <Header plan={plan} planLabel={planLabel} />}

      <Routes>
        <Route path="/" element={<Dashboard plan={plan} />} />

        {/* Analyzer */}
        <Route path="/wohnung" element={<WohnCheck />} />
        <Route path="/mfh" element={<MFHCheck />} />
        <Route path="/miete" element={<Mietkalkulation />} />
        <Route path="/finanzierung-simpel" element={<FinanzierungSimple />} />
        <Route path="/einfamilienhaus" element={<Einfamilienhaus />} />
        <Route path="/mixed" element={<MixedUseCheck />} />
        <Route path="/gewerbe" element={<GewerbeCheck />} />
        <Route path="/vergleich" element={<Compare />} />
        <Route path="/afa" element={<AfaRechner />} />
        <Route path="/finanzierung" element={<Finanzierung />} />

        {/* Pricing / Checkout / Konto */}
        <Route path="/preise" element={<Pricing />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/upgrade" element={<Upgrade />} />
        <Route path="/konto" element={<Konto />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />

        {/* NEU: Auth-Flow-Routen */}
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/update-password" element={<UpdatePassword />} />

        {/* Diagnose */}
        <Route path="/authprobe" element={<AuthProbe />} />

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
