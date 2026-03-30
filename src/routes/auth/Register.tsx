import React from "react";
import { SignUp } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";
import { Home, BarChart2, Shield, Zap } from "lucide-react";

const BENEFITS = [
  { icon: Home, text: "Wohnungs-Analyzer kostenlos nutzen" },
  { icon: BarChart2, text: "Rendite & Cashflow in 60 Sekunden" },
  { icon: Shield, text: "Keine Kreditkarte erforderlich" },
  { icon: Zap, text: "Sofort loslegen, kein Download" },
];

const AVATARS = [
  { src: "https://i.pravatar.cc/150?img=11", alt: "Investor 1" },
  { src: "https://i.pravatar.cc/150?img=32", alt: "Investor 2" },
  { src: "https://i.pravatar.cc/150?img=45", alt: "Investor 3" },
  { src: "https://i.pravatar.cc/150?img=68", alt: "Investor 4" },
];

export default function Register() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "/";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-16"
      style={{
        background: "radial-gradient(ellipse at 60% 0%, #1a3a6e 0%, #0F1E3D 60%, #080f1f 100%)",
      }}
    >
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

        {/* Linke Seite */}
        <div className="text-left">
          <img src="/assets/propora-logo.png" alt="PROPORA" className="h-10 w-auto mb-8" />

          <h1 className="text-white text-3xl font-bold leading-tight mb-4">
            Smarter investieren.<br />
            <span className="text-[#FCDC45]">Kostenlos starten.</span>
          </h1>
          <p className="text-gray-400 text-base mb-8">
            Analysiere Immobilien wie ein Profi — mit dem Wohnungs-Analyzer sofort und ohne Risiko.
          </p>

          <ul className="space-y-4 mb-10">
            {BENEFITS.map(({ icon: Icon, text }, i) => (
              <li key={i} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-[#FCDC45]" />
                </div>
                <span className="text-gray-200 text-sm">{text}</span>
              </li>
            ))}
          </ul>

          {/* Social Proof */}
          <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
            <div className="flex -space-x-3 flex-shrink-0">
              {AVATARS.map((a, i) => (
  <img
    key={i}
    src={a.src}
    alt={a.alt}
                  className="w-9 h-9 rounded-full border-2 border-[#0F1E3D] bg-white object-cover"
                />
              ))}
            </div>
            <p className="text-gray-300 text-sm leading-snug">
              <span className="text-white font-semibold">1.200+ Investoren</span> nutzen PROPORA bereits
            </p>
          </div>
        </div>

        {/* Rechte Seite */}
        <div className="flex flex-col items-center">
          <div className="mb-6 text-center">
            <h2 className="text-white text-xl font-semibold">Kostenlosen Account erstellen</h2>
            <p className="text-gray-400 text-sm mt-1">Dauert weniger als 60 Sekunden.</p>
          </div>

          <div className="w-full max-w-sm mx-auto">
 	  <SignUp
              redirectUrl={next}
              signInUrl="/login"
              appearance={{
                layout: { logoPlacement: "none" },
                variables: {
                  colorPrimary: "#0F2C8A",
                  colorText: "#0F172A",
                  colorBackground: "#FFFFFF",
                  borderRadius: "16px",
                  spacingUnit: "8px",
                  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
                },
                elements: {
                  card: "rounded-2xl shadow-2xl border border-gray-100 p-8 bg-white w-full",
                  formFieldLabel: "text-sm text-gray-700 mb-1",
                  formFieldInput: "rounded-xl border-gray-300 focus:ring-2 focus:ring-[#0F2C8A]/30",
                  formButtonPrimary: "rounded-xl bg-[#FCDC45] text-[#0F1E3D] font-semibold hover:brightness-110 transition-all mt-4",
                  header: "hidden",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  footer: "hidden",
                  footerAction: "hidden",
                  dividerLine: "bg-gray-200",
                  rootBox: "w-full",
                },
              }}
            />
          </div>

          <div className="mt-5 text-center text-sm text-gray-400">
            Bereits ein Konto?{" "}
            <a href="/login" className="font-semibold text-[#FCDC45] hover:underline">
              Einloggen
            </a>
          </div>
        </div>

      </div>
    </div>
  );
}