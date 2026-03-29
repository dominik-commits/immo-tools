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
      colorPrimary: "#0F2C8A", // PROPORA Blau
      colorText: "#0F172A",
      colorBackground: "#FFFFFF",
      borderRadius: "16px",
      spacingUnit: "8px",
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto',
    },
    elements: {
      // Popover-Karte & Identifiers
      userButtonPopoverCard: "shadow-lg border border-gray-200 rounded-2xl",
      userPreview: "p-3",
      userPreviewMainIdentifier: "font-semibold text-gray-900",
      userPreviewSecondaryIdentifier: "text-gray-500",

      // Aktionen/Zeilen
      userButtonPopoverActions: "divide-y divide-gray-100",
      userButtonPopoverActionButton:
        "hover:bg-gray-50 text-gray-800 rounded-xl",
      userButtonPopoverActionButton__signOut:
        "text-red-600 hover:bg-red-50 rounded-xl",

      // Trigger/Avatar
      userButtonTrigger: "focus:ring-2 focus:ring-[#0F2C8A]/30 rounded-full",
      userButtonAvatarBox: "ring-2 ring-[#0F2C8A]/10 rounded-full",

      // Footer ausblenden (Hinweis: „Development mode“ bleibt im Dev sichtbar)
      userButtonPopoverFooter: "hidden",
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
