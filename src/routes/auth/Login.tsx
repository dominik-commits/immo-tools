import React from "react";
import { SignIn } from "@clerk/clerk-react";

const PRICING_URL =
  (typeof window !== "undefined" && (window as any).__PRICING_URL__) ||
  import.meta.env.VITE_PRICING_URL ||
  "https://www.propora.de/preise";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1E3D] px-6 py-16">
      <div className="w-full max-w-md text-center">
        {/* Logo + Claim */}
        <div className="mb-10 flex flex-col items-center">
          <img src="/assets/propora-logo.png" alt="PROPORA" className="h-10 w-auto mb-2" />
          <p className="text-gray-400 text-sm tracking-wide">
            Immotools für smarte Entscheidungen
          </p>
        </div>

        {/* Headline */}
        <h1 className="text-white text-2xl font-semibold mb-2">Bei PROPORA einloggen</h1>
        <p className="text-gray-400 mb-8 text-sm">Melde dich an, um deine Analysen zu starten.</p>

        {/* Clerk-Karte styled (kein zusätzlicher Wrapper mehr) */}
        <SignIn
          afterSignInUrl="/"
          signUpUrl={undefined as unknown as string}
          appearance={{
            layout: { logoPlacement: "none" },
            variables: {
              colorPrimary: "#0F2C8A",
              colorText: "#0F172A",
              colorBackground: "#FFFFFF",
              borderRadius: "16px",
              spacingUnit: "8px",
              fontFamily:
                'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
            },
            elements: {
              // Die Karte ist die weiße Box mit ausreichend Innenabstand
              card:
                "rounded-2xl shadow-lg border border-gray-200 p-6 bg-white overflow-visible",

              // Inputs/Labels
              formFieldLabel: "text-sm text-gray-700 mb-1",
              formFieldInput:
                "rounded-xl border-gray-300 focus:ring-2 focus:ring-[#0F2C8A]/30",

              // Primärer Button im PROPORA-Gelb
              formButtonPrimary:
                "rounded-xl bg-[#FCDC45] text-[#0F1E3D] font-semibold hover:brightness-110 transition-all mt-4",

              // Clerk-Header/Subtitle ausblenden (wir haben unseren eigenen Header)
              header: "hidden",
              headerTitle: "hidden",
              headerSubtitle: "hidden",

              // Standard-Footer (Sign-up) ausblenden
              footer: "hidden",
              footerAction: "hidden",
              footerAction__signUp: "hidden",

              // Kleinigkeiten
              dividerLine: "bg-gray-200",
              identityPreviewEditButton__button:
                "text-[#0F2C8A] hover:underline",
            },
          }}
        />

        {/* CTA unten */}
        <div className="mt-6 text-sm text-gray-300">
          Noch keinen Zugang?{" "}
          <a
            href={PRICING_URL}
            className="font-semibold text-[#FCDC45] hover:underline"
          >
            Plan kaufen
          </a>
        </div>
      </div>
    </div>
  );
}
