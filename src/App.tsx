import React from "react";
import { Link, NavLink, Route, Routes, Navigate } from "react-router-dom";
import { ChartPie, House, Building2, Briefcase, Calculator, Settings, Wallet } from "lucide-react";

import Compare from "./routes/Compare";
import { Home } from "./routes/Home";
import Pricing from "./routes/Pricing";

import Eigentumswohnung from "./routes/Eigentumswohnung";
import MFHCheck from "./routes/MFHCheck";
import GewerbeCheck from "./routes/GewerbeCheck";
import AfaRechner from "./routes/AfaRechner";
import Mietkalkulation from "./routes/Mietkalkulation";
import Finanzierung from "./routes/Finanzierung";
import FinanzierungSimple from "./routes/FinanzierungSimple";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <ChartPie className="h-5 w-5" />
            <span className="font-semibold">Immo Quick-Checks</span>
            <span className="text-xs text-gray-500">MVP</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <TopLink to="/eigentum" icon={<House className="h-4 w-4" />}>Eigentumswohnung</TopLink>
            <TopLink to="/mfh" icon={<Building2 className="h-4 w-4" />}>MFH</TopLink>
            <TopLink to="/gewerbe" icon={<Briefcase className="h-4 w-4" />}>Gewerbe</TopLink>
            <TopLink to="/compare" icon={<Calculator className="h-4 w-4" />}>Vergleich</TopLink>
            <TopLink to="/mietkalkulation" icon={<Calculator className="h-4 w-4" />}>Mietkalk.</TopLink>
            <TopLink to="/afa" icon={<Settings className="h-4 w-4" />}>AfA</TopLink>
            <TopLink to="/finanzierung" icon={<Wallet className="h-4 w-4" />}>Finanzierung</TopLink>
            <TopLink to="/finanzierung-simple" icon={<Wallet className="h-4 w-4" />}>Finanzierung (simpel)</TopLink>
			<Link
  to="/pricing"
  className="ml-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm bg-black text-white hover:bg-gray-900"
>
  Preise
</Link>

          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/eigentum" element={<Eigentumswohnung />} />
          <Route path="/mfh" element={<MFHCheck />} />
          <Route path="/gewerbe" element={<GewerbeCheck />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/mietkalkulation" element={<Mietkalkulation />} />
          <Route path="/afa" element={<AfaRechner />} />
          <Route path="/finanzierung" element={<Finanzierung />} />
          <Route path="/finanzierung-simple" element={<FinanzierungSimple />} />
		  <Route path="/pricing" element={<Pricing />} />

          <Route path="/wohn" element={<Navigate to="/eigentum" replace />} />
          <Route path="/wohn-check" element={<Navigate to="/eigentum" replace />} />
          <Route path="/gewerbe-check" element={<Navigate to="/gewerbe" replace />} />
          <Route path="/mfh-check" element={<Navigate to="/mfh" replace />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <footer className="max-w-6xl mx-auto px-4 py-8 text-xs text-gray-500">
        Hinweis: Vereinfachtes Modell zu Lernzwecken. Keine Steuer-/Rechtsberatung.
      </footer>
    </div>
  );
}

function TopLink({
  to, icon, children,
}: { to: string; icon: React.ReactNode; children: React.ReactNode; }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) =>
        "px-3 py-1.5 rounded-full text-sm border " +
        (isActive ? "bg-black text-white border-black" : "bg-white hover:bg-gray-100")
      }
    >
      <span className="inline-flex items-center gap-1">
        {icon}{children}
      </span>
    </NavLink>
  );
}

function NotFound() {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <h2 className="text-lg font-semibold mb-1">Seite nicht gefunden</h2>
      <p className="text-gray-600">Die aufgerufene Route existiert nicht. Wähle oben ein Tool aus.</p>
      <div className="mt-3">
        <Link to="/" className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-white hover:bg-gray-50 text-sm">
          Zur Startseite
        </Link>
      </div>
    </div>
  );
}
