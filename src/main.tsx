// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { ClerkProvider } from "@clerk/clerk-react";
import { deDE } from "@clerk/localizations"; // ← Deutsch
import App from "./App";
import "./index.css";

const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

// Optional für PROD-Satellite (z. B. tools.propora.de als Satellite von accounts.domain)
const SATELLITE_ENABLED = import.meta.env.VITE_CLERK_IS_SATELLITE === "true";
const SATELLITE_DOMAIN = import.meta.env.VITE_CLERK_DOMAIN as string | undefined;

function AppWithRouter() {
  const navigate = useNavigate();

  const routerPush = (to: string) => navigate(to);
  const routerReplace = (to: string) => navigate(to, { replace: true });

  const isLocalhost =
    typeof window !== "undefined" && window.location.hostname === "localhost";

  // CI-Design zentral definieren
  const appearance = {
    variables: {
      colorPrimary: "#FCDC45",
      colorText: "rgba(255,255,255,0.88)",
      colorTextSecondary: "rgba(255,255,255,0.45)",
      colorBackground: "#161b22",
      colorInputBackground: "rgba(255,255,255,0.05)",
      colorInputText: "rgba(255,255,255,0.88)",
      borderRadius: "12px",
      spacingUnit: "8px",
      fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
    },
    elements: {
      userButtonPopoverCard: {
        background: "#161b22",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
        borderRadius: "12px",
      },
      userButtonPopoverActionButton: {
        color: "rgba(255,255,255,0.7)",
        borderRadius: "8px",
      },
      userButtonPopoverActionButton__danger: { color: "#f87171" },
      userButtonPopoverActionButtonText: { color: "rgba(255,255,255,0.7)", fontSize: "13px" },
      userButtonPopoverActionButtonIcon: { color: "rgba(255,255,255,0.4)" },
      userPreviewMainIdentifier: { color: "rgba(255,255,255,0.88)", fontWeight: "600" },
      userPreviewSecondaryIdentifier: { color: "rgba(255,255,255,0.45)", fontSize: "12px" },
      userButtonPopoverFooter: { display: "none" },
      userButtonTrigger: { borderRadius: "50%" },
      userButtonAvatarBox: { width: "34px", height: "34px" },
    },
  } as const;

  // Props für Clerk – inkl. Deutsch & CI
  const baseProps = {
    publishableKey: pk,
    routerPush,
    routerReplace,
    signInFallbackRedirectUrl: "/",
    signUpFallbackRedirectUrl: "/",
    afterSignOutUrl: "/login",
    localization: deDE,      // ← Deutsch aktiv
    appearance,              // ← CI-Styles
  } as const;

  // Lokal KEIN Satellite; in Prod optional, wenn per ENV aktiviert
  const providerProps =
    !isLocalhost && SATELLITE_ENABLED && SATELLITE_DOMAIN
      ? { ...baseProps, isSatellite: true as const, domain: SATELLITE_DOMAIN }
      : baseProps;

  return (
    <ClerkProvider {...providerProps}>
      <App />
    </ClerkProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppWithRouter />
    </BrowserRouter>
  </React.StrictMode>
);
