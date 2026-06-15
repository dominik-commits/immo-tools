import React, { useState } from "react";
import { SignUp } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";
import { Shield, Star, CheckCircle2 } from "lucide-react";

const AVATARS = [
  { src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face", alt: "Investor 1" },
  { src: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face", alt: "Investor 2" },
  { src: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face", alt: "Investor 3" },
  { src: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop&crop=face", alt: "Investor 4" },
  { src: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&crop=face", alt: "Investor 5" },
];

const TESTIMONIALS = [
  {
    name: "Marcus T.",
    role: "Immobilieninvestor",
    img: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop&crop=face",
    text: "In 2 Minuten hatte ich das Ergebnis – besser als mein Excel-Sheet nach 3 Stunden.",
  },
  {
    name: "Sandra K.",
    role: "Erstkäuferin",
    img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face",
    text: "Der Standort-Score hat mir geholfen, das richtige Objekt in der richtigen Stadt zu finden.",
  },
  {
    name: "Felix B.",
    role: "Portfolio-Investor",
    img: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop&crop=face",
    text: "Endlich ein Tool das auch MFH und Gewerbe kann. Der Bankbericht ist Gold wert.",
  },
];

const BENEFITS = [
  "Kostenlos starten",
  "Keine Kreditkarte",
  "DSGVO-konform",
  "Sofort loslegen",
];

export default function Register() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "/";
  const checkoutPlan = params.get("plan");
  const checkoutSuccess = params.get("checkout") === "success";

  const [agbAccepted, setAgbAccepted] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

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
        {checkoutSuccess && (
          <div className="w-full max-w-md mx-auto mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
            ✓ Zahlung erfolgreich! Erstelle jetzt deinen Account um auf dein {checkoutPlan?.toUpperCase()}-Abo zuzugreifen.
          </div>
        )}
        {checkoutSuccess && (
          <div className="w-full max-w-md mx-auto mb-4 px-4 py-3 rounded-xl text-sm font-medium text-center" style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
            ✓ Zahlung erfolgreich! Erstelle jetzt deinen Account um auf dein {(checkoutPlan || "").toUpperCase()}-Abo zuzugreifen.
          </div>
        )}
        <h1 className="text-white text-3xl md:text-4xl font-bold leading-tight mb-3">
          Immobilien-Rendite<br />
          <span className="text-[#FCDC45]">in 60 Sekunden.</span>
        </h1>
        <p className="text-gray-400 text-base">
          Kaufpreis, Miete, Finanzierung – sofort sehen ob sich das Objekt lohnt.
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
            boxShadow: "0 0 0 1px rgba(252,220,69,0.2), 0 30px 80px rgba(0,0,0,0.6), 0 0 60px rgba(252,220,69,0.05)",
          }}
        >
          {/* Card Header – wechselt nach Formular-Submit */}
          <div className="bg-[#0F2C8A] px-6 py-4 text-center">
            <h2 className="text-white text-lg font-bold">
              {verificationSent ? "Fast geschafft!" : "Kostenlosen Account erstellen"}
            </h2>
            <p className="text-blue-200 text-sm mt-0.5">
              {verificationSent ? "Bitte E-Mail-Adresse bestätigen" : "Dauert weniger als 60 Sekunden"}
            </p>
          </div>

          {/* E-Mail Bestätigungs-Banner */}
          {verificationSent && (
            <div className="px-6 py-4 flex items-start gap-3" style={{ background: "rgba(252,220,69,0.08)", borderBottom: "1px solid rgba(252,220,69,0.15)" }}>
              <span className="text-2xl flex-shrink-0">&#128231;</span>
              <div>
                <p className="text-white text-sm font-semibold mb-1">Bestätigungsmail wurde verschickt!</p>
                <p className="text-gray-300 text-xs leading-relaxed">
                  Wir haben dir eine E-Mail geschickt. Klicke auf den Bestätigungslink darin, um deinen Account zu aktivieren.{" "}
                  <span className="text-[#FCDC45] font-medium">Auch den Spam-Ordner prüfen.</span>
                </p>
              </div>
            </div>
          )}

          {/* White Body */}
          <div className="bg-white px-8 pt-6 pb-8">

            {/* Checkboxen – nur sichtbar wenn noch kein Verify-Step */}
            {!verificationSent && (
              <div className="mb-4 space-y-2.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={agbAccepted}
                      onChange={(e) => setAgbAccepted(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${agbAccepted ? "bg-[#0F2C8A] border-[#0F2C8A]" : "border-gray-300"}`}>
                      {agbAccepted && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-600 text-xs leading-relaxed">
                    Ich akzeptiere{" "}
                    <a href="https://www.propora.de/agb" target="_blank" rel="noopener noreferrer" className="text-[#0F2C8A] underline font-medium">AGB</a>
                    {" "}und{" "}
                    <a href="https://www.propora.de/datenschutz" target="_blank" rel="noopener noreferrer" className="text-[#0F2C8A] underline font-medium">Datenschutz</a>.{" "}
                    <span className="text-red-500">*</span>
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <div className="relative flex-shrink-0 mt-0.5">
                    <input
                      type="checkbox"
                      checked={newsletter}
                      onChange={(e) => setNewsletter(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${newsletter ? "bg-[#0F2C8A] border-[#0F2C8A]" : "border-gray-300"}`}>
                      {newsletter && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="text-gray-500 text-xs leading-relaxed">Newsletter: neue Features & Marktanalysen. (optional)</span>
                </label>
              </div>
            )}

            <style>{`
              .cl-rootBox, .cl-rootBox *, .cl-card, .cl-card *, .cl-form, .cl-form *, .cl-main, .cl-main * { color: #1F2937 !important; }
              .cl-card { background: white !important; overflow: visible !important; box-shadow: none !important; border: none !important; padding: 0 !important; }
              [class*="cl-internal"] { overflow: visible !important; }
              .cl-formFieldLabel { color: #374151 !important; font-size: 13px !important; font-weight: 600 !important; margin-bottom: 4px !important; }
              .cl-formFieldInput, .cl-input { background-color: #F9FAFB !important; border: 1.5px solid #D1D5DB !important; border-radius: 8px !important; color: #111827 !important; font-size: 14px !important; padding: 10px 12px !important; }
              .cl-formFieldInput:focus, .cl-input:focus { border-color: #0F2C8A !important; outline: none !important; box-shadow: 0 0 0 2px rgba(15,44,138,0.15) !important; }
              .cl-formFieldInput::placeholder { color: transparent !important; }
              .cl-formButtonPrimary { background: #FCDC45 !important; background-color: #FCDC45 !important; color: #0F1E3D !important; font-weight: 700 !important; font-size: 15px !important; border-radius: 10px !important; padding: 13px 24px !important; border: none !important; box-shadow: none !important; outline: none !important; margin-top: 8px !important; }
              .cl-formButtonPrimary:hover { filter: brightness(1.05) !important; box-shadow: none !important; }
              .cl-formButtonPrimary:focus { box-shadow: none !important; outline: none !important; }
              .cl-header, .cl-footer, .cl-footerAction, [class*="cl-header"], [class*="cl-footer"] { display: none !important; height: 0 !important; }
              .cl-socialButtonsBlockButton { border: 1.5px solid #E5E7EB !important; border-radius: 8px !important; background: white !important; box-shadow: none !important; color: #374151 !important; }
              .cl-socialButtonsBlockButtonText { color: #374151 !important; }
              .cl-dividerLine { background-color: #E5E7EB !important; }
              .cl-dividerText { color: #9CA3AF !important; font-size: 12px !important; }
              .cl-formFieldInputShowPasswordButton, .cl-formFieldInputShowPasswordButton svg { color: #9CA3AF !important; }
            `}</style>

            {/* Clerk SignUp – MutationObserver erkennt Verify-Step */}
            <div
              ref={(el) => {
                if (!el) return;
                // Listen for clicks anywhere in the Clerk form
                // When user submits, show banner after short delay
                el.addEventListener("click", (e) => {
                  const target = e.target as HTMLElement;
                  const btn = target.closest("button");
                  if (btn) {
                    setTimeout(() => setVerificationSent(true), 1200);
                  }
                });
                // Also watch DOM for Clerk's verify/check-email state
                const obs = new MutationObserver(() => {
                  const el2 = el as HTMLElement;
                  const text = el2.innerText || "";
                  if (
                    /check your email|Sie können diesen Tab|schließen|bestätig/i.test(text) ||
                    el.querySelector('input[name="code"]')
                  ) {
                    setVerificationSent(true);
                  }
                });
                obs.observe(el, { childList: true, subtree: true, characterData: true });
              }}
              className={`transition-opacity ${agbAccepted ? "opacity-100" : "opacity-40 pointer-events-none"}`}
            >
              <SignUp
                redirectUrl="https://tools.propora.de"
                afterSignUpUrl="https://tools.propora.de"
                signInUrl="/login"
                unsafeMetadata={{ newsletter }}
                appearance={{
                  layout: { logoPlacement: "none" },
                  variables: {
                    colorPrimary: "#0F2C8A",
                    colorText: "#0F172A",
                    colorBackground: "#FFFFFF",
                    colorInputBackground: "#F8FAFC",
                    colorInputText: "#0F172A",
                    colorNeutral: "#334155",
                    borderRadius: "10px",
                    spacingUnit: "8px",
                    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
                  },
                  elements: {
                    card: "shadow-none border-0 p-0 bg-white w-full",
                    formFieldLabel: "text-sm font-medium text-gray-700",
                    formFieldInput: "rounded-lg border-gray-200 bg-white text-gray-900 placeholder:text-gray-400",
                    formButtonPrimary: "rounded-xl bg-[#FCDC45] text-[#0F1E3D] font-bold text-base hover:brightness-105 transition-all py-3 mt-1",
                    header: "hidden",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    footer: "hidden",
                    footerAction: "hidden",
                    dividerLine: "bg-gray-200",
                    dividerText: "text-gray-400 text-xs",
                    rootBox: "w-full",
                    socialButtonsBlockButton: "border border-gray-200 rounded-lg hover:bg-gray-50",
                    socialButtonsBlockButtonText: "text-gray-700 font-medium text-sm",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Login Link */}
      <p className="text-center text-sm text-gray-500 mb-8">
        Bereits ein Konto?{" "}
        <a href="/login" className="font-semibold text-[#FCDC45] hover:underline">Einloggen</a>
      </p>

      {/* Social Proof */}
      <div className="w-full max-w-2xl mb-5">
        <div className="flex flex-col items-center gap-2 mb-5">
          <div className="flex -space-x-2">
            {AVATARS.map((a, i) => (
              <img key={i} src={a.src} alt={a.alt} className="w-9 h-9 rounded-full border-2 border-[#0F1E3D] object-cover" />
            ))}
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-[#FCDC45] text-[#FCDC45]" />
              ))}
              <span className="text-white font-bold ml-1">4.9</span>
            </div>
            <p className="text-gray-400 text-sm">1.200+ Investoren vertrauen PROPORA</p>
          </div>
        </div>

        {/* Testimonials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center gap-2.5">
                <img src={t.img} alt={t.name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                <div>
                  <div className="text-white text-sm font-semibold leading-tight">{t.name}</div>
                  <div className="text-gray-500 text-xs">{t.role}</div>
                </div>
              </div>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-3 h-3 fill-[#FCDC45] text-[#FCDC45]" />
                ))}
              </div>
              <p className="text-gray-300 text-xs leading-relaxed">"{t.text}"</p>
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