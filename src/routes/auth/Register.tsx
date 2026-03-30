import React from "react";
import { SignUp } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";

export default function Register() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "/";

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
        <h1 className="text-white text-2xl font-semibold mb-2">Kostenlos registrieren</h1>
        <p className="text-gray-400 mb-8 text-sm">
          Erstelle deinen Account und starte sofort mit dem Wohnungs-Analyzer.
        </p>

        {/* Clerk SignUp */}
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
              card: "rounded-2xl shadow-lg border border-gray-200 p-6 bg-white overflow-visible",
              formFieldLabel: "text-sm text-gray-700 mb-1",
              formFieldInput: "rounded-xl border-gray-300 focus:ring-2 focus:ring-[#0F2C8A]/30",
              formButtonPrimary: "rounded-xl bg-[#FCDC45] text-[#0F1E3D] font-semibold hover:brightness-110 transition-all mt-4",
              header: "hidden",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              footer: "hidden",
              footerAction: "hidden",
              dividerLine: "bg-gray-200",
            },
          }}
        />

        {/* CTA unten */}
        <div className="mt-6 text-sm text-gray-300">
          Bereits ein Konto?{" "}
          <a href="/login" className="font-semibold text-[#FCDC45] hover:underline">
            Einloggen
          </a>
        </div>
      </div>
    </div>
  );
}