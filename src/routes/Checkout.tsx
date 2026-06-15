import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { SignUp, useUser } from "@clerk/clerk-react";
import { Shield, CheckCircle2, Star } from "lucide-react";

const PLAN_LABELS: Record<string, string> = {
  basis: "Basis",
  pro: "Pro",
};

const PLAN_PRICES: Record<string, string> = {
  "basis:yearly": "99 €/Jahr",
  "basis:monthly": "12 €/Monat",
  "pro:yearly": "199 €/Jahr",
  "pro:monthly": "25 €/Monat",
};

const PLAN_FEATURES: Record<string, string[]> = {
  basis: [
    "Wohnungs-Rendite (ETW)",
    "Mietshaus-Analyse (MFH)",
    "Finanzierungsrechner",
    "Bankgespräch-Report (PDF)",
    "KI-Assistent",
  ],
  pro: [
    "Alles aus Basis",
    "Einfamilienhaus-Check",
    "Gewerbe & Mixed-Use",
    "Objekt-Vergleich & Portfolio",
    "Chrome-Extension: Exposé-Import",
    "Priorisierter Support",
  ],
};

export default function CheckoutPage() {
  const location = useLocation();
  const { isSignedIn, user } = useUser();
  const params = new URLSearchParams(location.search);
  const plan = (params.get("plan") || "basis") as "basis" | "pro";
  const interval = (params.get("interval") || "yearly") as "yearly" | "monthly";

  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (plan && !isSignedIn) {
      sessionStorage.setItem("pending_checkout_plan", plan);
      sessionStorage.setItem("pending_checkout_interval", interval);
    }
  }, [plan, interval, isSignedIn]);
  const [agbAccepted, setAgbAccepted] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (isSignedIn && step === 1) {
      setStep(2);
    }
  }, [isSignedIn, step]);

  function goToStripe() {
    setIsRedirecting(true);
    const userId = user?.id || "";
    const email = user?.primaryEmailAddress?.emailAddress || "";
    window.location.href = `/api/stripe/create-checkout-session?plan=${plan}&interval=${interval}&userId=${userId}&email=${encodeURIComponent(email)}`;
  }

  const priceKey = `${plan}:${interval}`;
  const planLabel = PLAN_LABELS[plan] || plan;
  const planPrice = PLAN_PRICES[priceKey] || "";
  const features = PLAN_FEATURES[plan] || [];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10"
      style={{
        background: "radial-gradient(ellipse at 50% -10%, #1e4080 0%, #0F1E3D 50%, #060d1a 100%)",
      }}
    >
      <a href="https://www.propora.de" className="mb-8">
        <img src="/assets/propora-logo.png" alt="PROPORA" className="h-9 w-auto" />
      </a>

      <div className="mb-6 text-center">
        <div className="inline-flex items-center gap-2 bg-[#FCDC45]/10 border border-[#FCDC45]/30 rounded-full px-4 py-1.5 mb-2">
          <span className="text-[#FCDC45] text-xs font-semibold tracking-wide">
            {planLabel}-Plan &middot; {planPrice}
          </span>
        </div>
        <h1 className="text-white text-2xl font-bold">{planLabel}-Plan aktivieren</h1>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-3 mb-8">
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${step === 1 ? "bg-[#FCDC45] text-[#0F1E3D]" : "bg-white/10 text-white"}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? "bg-[#0F1E3D] text-[#FCDC45]" : "bg-[#FCDC45] text-[#0F1E3D]"}`}>
            {step > 1 ? "✓" : "1"}
          </span>
          Konto erstellen
        </div>
        <div className="w-8 h-px bg-white/20" />
        <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${step === 2 ? "bg-[#FCDC45] text-[#0F1E3D]" : "bg-white/10 text-white/50"}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? "bg-[#0F1E3D] text-[#FCDC45]" : "bg-white/20 text-white/50"}`}>
            2
          </span>
          Zahlung
        </div>
      </div>

      <div className="w-full max-w-4xl flex gap-6 items-start">

        {/* Left: Plan Summary */}
        <div className="hidden md:flex flex-col w-72 flex-shrink-0">
          <div className="rounded-2xl p-6" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="text-xs font-bold tracking-widest text-[#FCDC45] uppercase mb-1">{planLabel}-Plan</div>
            <div className="text-3xl font-bold text-white mb-1">{planPrice.split("/")[0]}</div>
            <div className="text-sm text-white/40 mb-4">/{interval === "yearly" ? "Jahr" : "Monat"} &middot; jährlich abgerechnet</div>
            <hr style={{ borderColor: "rgba(255,255,255,0.07)", marginBottom: 16 }} />
            <ul className="space-y-2">
              {features.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                  <CheckCircle2 className="w-4 h-4 text-[#FCDC45] flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <hr style={{ borderColor: "rgba(255,255,255,0.07)", margin: "16px 0" }} />
            <div className="flex items-center gap-1.5 text-xs text-white/30">
              <Shield className="w-3.5 h-3.5" />
              SSL &middot; DSGVO &middot; Stripe gesichert
            </div>
          </div>
          <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(252,220,69,0.05)", border: "1px solid rgba(252,220,69,0.15)" }}>
            <div className="flex gap-0.5 mb-2">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-3 h-3 fill-[#FCDC45] text-[#FCDC45]" />)}
            </div>
            <p className="text-white/60 text-xs leading-relaxed italic">
              "In 2 Minuten hatte ich das Ergebnis – besser als mein Excel-Sheet nach 3 Stunden."
            </p>
            <div className="mt-2 text-xs text-white/40">Markus K. &middot; Erstinvestor</div>
          </div>
        </div>

        {/* Right: Steps */}
        <div className="flex-1">
          {step === 1 && (
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(252,220,69,0.2), 0 30px 80px rgba(0,0,0,0.6)" }}>
              <div className="bg-[#0F2C8A] px-6 py-4">
                <h2 className="text-white text-lg font-bold">Schritt 1 – Konto erstellen</h2>
                <p className="text-blue-200 text-sm mt-0.5">Erstelle deinen PROPORA-Account</p>
              </div>
              <div className="bg-white px-8 pt-5 pb-7">
                <div className="mb-4 space-y-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input type="checkbox" checked={agbAccepted} onChange={(e) => setAgbAccepted(e.target.checked)} className="sr-only" />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${agbAccepted ? "bg-[#0F2C8A] border-[#0F2C8A]" : "border-gray-300"}`}>
                        {agbAccepted && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                    <span className="text-gray-600 text-xs leading-relaxed">
                      Ich akzeptiere <a href="https://www.propora.de/agb" target="_blank" rel="noopener noreferrer" className="text-[#0F2C8A] underline font-medium">AGB</a> und <a href="https://www.propora.de/datenschutz" target="_blank" rel="noopener noreferrer" className="text-[#0F2C8A] underline font-medium">Datenschutz</a>. <span className="text-red-500">*</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <div className="relative flex-shrink-0 mt-0.5">
                      <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="sr-only" />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${newsletter ? "bg-[#0F2C8A] border-[#0F2C8A]" : "border-gray-300"}`}>
                        {newsletter && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    </div>
                    <span className="text-gray-500 text-xs leading-relaxed">Newsletter: neue Features & Marktanalysen. (optional)</span>
                  </label>
                </div>
                <style>{`
                  .cl-rootBox, .cl-rootBox *, .cl-card, .cl-card * { color: #1F2937 !important; }
                  .cl-card { background: white !important; box-shadow: none !important; border: none !important; padding: 0 !important; }
                  .cl-formFieldLabel { color: #374151 !important; font-size: 13px !important; font-weight: 600 !important; }
                  .cl-formFieldInput, .cl-input { background-color: #F9FAFB !important; border: 1.5px solid #D1D5DB !important; border-radius: 8px !important; color: #111827 !important; }
                  .cl-formButtonPrimary { background: #FCDC45 !important; color: #0F1E3D !important; font-weight: 700 !important; border-radius: 10px !important; border: none !important; box-shadow: none !important; }
                  .cl-header, .cl-footer, .cl-footerAction { display: none !important; height: 0 !important; }
                  .cl-formFieldInput::placeholder { color: transparent !important; }
                `}</style>
                <div className={agbAccepted ? "opacity-100" : "opacity-40 pointer-events-none"}>
                  <SignUp
                    afterSignUpUrl={`https://tools.propora.de/checkout?plan=${plan}&interval=${interval}`}
                    signInUrl={`/login?next=${encodeURIComponent(`/checkout?plan=${plan}&interval=${interval}`)}`}
                    unsafeMetadata={{ newsletter }}
                    appearance={{
                      layout: { logoPlacement: "none" },
                      variables: {
                        colorPrimary: "#0F2C8A",
                        colorBackground: "#FFFFFF",
                        colorInputBackground: "#F8FAFC",
                        borderRadius: "10px",
                      },
                      elements: {
                        card: "shadow-none border-0 p-0 bg-white w-full",
                        header: "hidden",
                        footer: "hidden",
                        rootBox: "w-full",
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(252,220,69,0.2), 0 30px 80px rgba(0,0,0,0.6)" }}>
              <div className="bg-[#0F2C8A] px-6 py-4">
                <h2 className="text-white text-lg font-bold">Schritt 2 – Zahlung</h2>
                <p className="text-blue-200 text-sm mt-0.5">Sicher bezahlen via Stripe</p>
              </div>
              <div className="bg-white px-8 pt-6 pb-8 text-center">
                {user && (
                  <div className="mb-5 p-3 rounded-xl text-sm" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
                    <span className="text-green-600 font-semibold">✓ Account erstellt</span>
                    <span className="text-gray-500 ml-2">{user.primaryEmailAddress?.emailAddress}</span>
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-3xl font-bold text-gray-900 mb-1">{planPrice}</div>
                  <div className="text-sm text-gray-400">{planLabel}-Plan &middot; {interval === "yearly" ? "jährlich" : "monatlich"}</div>
                </div>
                <div className="space-y-2 mb-6 text-left">
                  {features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-[#0F2C8A] flex-shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={goToStripe}
                  disabled={isRedirecting}
                  className="w-full py-4 rounded-xl font-bold text-base transition-all"
                  style={{ background: "#FCDC45", color: "#0F1E3D" }}
                >
                  {isRedirecting ? "Weiterleitung..." : `Jetzt ${planLabel} kaufen – ${planPrice} →`}
                </button>
                <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
                  <Shield className="w-3.5 h-3.5" />
                  SSL-verschlüsselt &middot; Stripe &middot; Rechnung per E-Mail
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-sm text-gray-500 mt-5">
            Bereits ein Konto?{" "}
            <a href={`/login?next=${encodeURIComponent(`/checkout?plan=${plan}&interval=${interval}`)}`} className="font-semibold text-[#FCDC45] hover:underline">Einloggen</a>
          </p>
        </div>
      </div>
    </div>
  );
}
