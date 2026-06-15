import React from "react";
import { SignIn } from "@clerk/clerk-react";
import { Shield, Star, CheckCircle2, MapPin, BarChart2, FileText } from "lucide-react";

const PRICING_URL =
  (typeof window !== "undefined" && (window as any).__PRICING_URL__) ||
  import.meta.env.VITE_PRICING_URL ||
  "https://www.propora.de/preise";

const AVATARS = [
  { src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face", alt: "Investor 1" },
  { src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face", alt: "Investor 2" },
  { src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face", alt: "Investor 3" },
  { src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face", alt: "Investor 4" },
  { src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&crop=face", alt: "Investor 5" },
];

const NEW_FEATURES = [
  {
    icon: MapPin,
    color: "#FCDC45",
    bgColor: "rgba(252,220,69,0.1)",
    borderColor: "rgba(252,220,69,0.25)",
    title: "Standort-Score",
    text: "1.228 PLZ mit Kaufpreisen, Mieten & Markttrend – direkt im Analyzer.",
  },
  {
    icon: BarChart2,
    color: "#4ade80",
    bgColor: "rgba(74,222,128,0.1)",
    borderColor: "rgba(74,222,128,0.25)",
    title: "Portfolio-Dashboard",
    text: "Alle analysierten Objekte zentral speichern und mit Status tracken.",
  },
  {
    icon: FileText,
    color: "#93b4ff",
    bgColor: "rgba(147,180,255,0.1)",
    borderColor: "rgba(147,180,255,0.25)",
    title: "PDF-Bankbericht",
    text: "Professioneller Bericht für das Bankgespräch – mit einem Klick exportieren.",
  },
];

const BENEFITS = [
  "9 Analyzer & Tools",
  "Standort-Score",
  "Portfolio-Dashboard",
  "PDF-Bankbericht",
];

export default function Login() {
  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-10"
      style={{
        background: "radial-gradient(ellipse at 50% -10%, #1e4080 0%, #0F1E3D 50%, #060d1a 100%)",
      }}
    >
      {/* Logo */}
      <a href="https://www.propora.de" className="mb-8 mt-2">
        <img src="/assets/propora-logo.png" alt="PROPORA" className="h-9 w-auto" />
      </a>

      {/* Headline */}
      <div className="text-center mb-5 max-w-lg">
        <div className="inline-flex items-center gap-2 bg-[#FCDC45]/10 border border-[#FCDC45]/30 rounded-full px-4 py-1.5 mb-4">
          <div className="w-2 h-2 rounded-full bg-[#FCDC45] animate-pulse" />
          <span className="text-[#FCDC45] text-xs font-semibold tracking-wide">1.200+ aktive Investoren</span>
        </div>
        <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight mb-3">
          Willkommen zurück.<br />
          <span className="text-[#FCDC45]">Deine Analysen warten.</span>
        </h1>
        <p className="text-gray-400 text-base">
          Melde dich an und analysiere Immobilien wie ein Profi – schnell, präzise und sicher.
        </p>
      </div>

      {/* Benefits Pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-7">
        {BENEFITS.map((b, i) => (
          <div key={i} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#FCDC45]" />
            <span className="text-gray-300 text-xs font-medium">{b}</span>
          </div>
        ))}
      </div>

      {/* Formular Card */}
      <div className="w-full max-w-md mb-5">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            boxShadow: "0 0 0 1px rgba(252,220,69,0.2), 0 30px 80px rgba(0,0,0,0.6)",
          }}
        >
          {/* Card Header */}
          <div className="bg-[#0F2C8A] px-6 py-4 text-center">
            <h2 className="text-white text-lg font-bold">Bei PROPORA einloggen</h2>
            <p className="text-blue-200 text-sm mt-0.5">Melde dich an, um deine Analysen zu starten.</p>
          </div>

          {/* White Body – mehr Padding damit Labels nicht abgeschnitten */}
          <div className="bg-white px-8 pt-6 pb-8">
            <style>{`
              .cl-formFieldInput, .cl-input {
                background-color: #F9FAFB !important;
                border: 1.5px solid #D1D5DB !important;
                border-radius: 8px !important;
                color: #111827 !important;
                font-size: 14px !important;
                padding: 10px 12px !important;
              }
              .cl-formFieldLabel {
                color: #374151 !important;
                font-size: 13px !important;
                font-weight: 600 !important;
              }
              .cl-formButtonPrimary {
                background: #FCDC45 !important;
                color: #0F1E3D !important;
                font-weight: 700 !important;
                border-radius: 10px !important;
                padding: 13px !important;
                border: none !important;
                box-shadow: none !important;
              }
              .cl-formButtonPrimary:hover { filter: brightness(1.05) !important; }
              .cl-formButtonPrimary:focus { box-shadow: none !important; outline: none !important; }
              .cl-card { box-shadow: none !important; border: none !important; padding: 0 !important; background: white !important; }
              .cl-header, .cl-footer, .cl-footerAction, [class*="cl-footer"], [class*="cl-header"] { display: none !important; height: 0 !important; }
              .cl-socialButtonsBlockButton { border: 1.5px solid #E5E7EB !important; border-radius: 8px !important; background: white !important; box-shadow: none !important; }
              .cl-dividerLine { background-color: #E5E7EB !important; }
              .cl-dividerText { color: #9CA3AF !important; font-size: 12px !important; }
              .cl-formFieldInputShowPasswordButton { color: #9CA3AF !important; }
              [class*="cl-internal"] { overflow: visible !important; }
            `}</style>
            <SignIn
              afterSignInUrl="/"
              signUpUrl="/register"
              appearance={{
                layout: { logoPlacement: "none" },
                variables: {
                  colorPrimary: "#0F2C8A",
                  colorText: "#111827",
                  colorBackground: "#FFFFFF",
                  colorInputBackground: "#F9FAFB",
                  colorInputText: "#111827",
                  colorNeutral: "#374151",
                  borderRadius: "10px",
                  spacingUnit: "8px",
                  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
                },
                elements: {
                  card: "shadow-none border-0 p-0 bg-white w-full",
                  rootBox: "w-full",
                  header: "hidden",
                  footer: "hidden",
                  footerAction: "hidden",
                  footerAction__signUp: "hidden",
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Links */}
      <p className="text-center text-sm text-gray-500 mb-8">
        Noch kein Konto?{" "}
        <a href="/register" className="font-semibold text-[#FCDC45] hover:underline">Kostenlos registrieren</a>
        <span className="mx-2 text-gray-700">·</span>
        <a href={PRICING_URL} className="font-semibold text-[#FCDC45] hover:underline">Plan kaufen</a>
      </p>

      {/* Neue Features */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex flex-col items-center gap-2 mb-5">
          <div className="flex -space-x-2">
            {AVATARS.map((a, i) => (
              <img key={i} src={a.src} alt={a.alt} className="w-9 h-9 rounded-full border-2 border-[#0F1E3D] object-cover" />
            ))}
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-[#FCDC45] text-[#FCDC45]" />)}
              <span className="text-white font-bold ml-1">4.9</span>
            </div>
            <p className="text-gray-400 text-sm">1.200+ Investoren vertrauen PROPORA</p>
          </div>
        </div>

        {/* 3 neue Features nebeneinander */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {NEW_FEATURES.map((f, i) => (
            <div key={i} className="rounded-xl p-4 flex flex-col gap-2"
              style={{ background: f.bgColor, border: `1px solid ${f.borderColor}` }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: f.bgColor, border: `1px solid ${f.borderColor}` }}>
                  <f.icon className="w-4 h-4" style={{ color: f.color }} />
                </div>
                <div>
                  <span className="text-white text-sm font-semibold">{f.title}</span>
                  <span className="ml-2 text-xs font-bold px-1.5 py-0.5 rounded"
                    style={{ background: f.bgColor, color: f.color, border: `1px solid ${f.borderColor}` }}>
                    NEU
                  </span>
                </div>
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust Badge */}
      <div className="flex items-center gap-1.5 text-gray-600 text-xs mb-6">
        <Shield className="w-3.5 h-3.5" />
        <span>SSL-verschlüsselt · DSGVO-konform · Made in Germany</span>
      </div>
    </div>
  );
}
