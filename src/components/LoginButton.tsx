// src/components/LoginButton.tsx
import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";

/**
 * Robuster Login-Button:
 * - Wenn nicht eingeloggt: interner NavLink -> /login?next=<aktuelle Route>
 * - Wenn eingeloggt: Konto + Logout als Buttons (ohne Voll-Reload)
 * - Mit Konsolen-Logs zur schnellen Fehlerdiagnose
 */
export default function LoginButton() {
  const { session, signOut } = useAuth();
  const loc = useLocation();
  const navigate = useNavigate();

  // Wohin nach dem Login? -> aktuelle Route als Default
  const next = encodeURIComponent(loc.pathname + (loc.search || "") + (loc.hash || ""));
  const targetLogin = `/login?next=${next || "%2F"}`;

  if (!session) {
    return (
      <NavLink
        to={targetLogin}
        onClick={() => {
          // Debug-Hinweis im Live-Bundle prüfen
          console.log("[LoginButton] navigate to", targetLogin);
        }}
        className="inline-flex items-center rounded-lg bg-[#0F2C8A] px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
      >
        Anmelden
      </NavLink>
    );
  }

  // Eingeloggt: Konto + Logout
  return (
    <div className="flex items-center gap-2">
      <NavLink
        to="/konto"
        className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
      >
        Konto
      </NavLink>
      <button
        onClick={async () => {
          try {
            console.log("[LoginButton] signOut()");
            await signOut();
            navigate("/", { replace: true });
          } catch (e) {
            console.error("Logout failed:", e);
          }
        }}
        className="inline-flex items-center rounded-lg bg-gray-800 px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
      >
        Logout
      </button>
    </div>
  );
}
