// src/components/LoginButton.tsx
import React from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "../contexts/AuthProvider";
import { NavLink } from "react-router-dom";
import useAutoLogin from "../hooks/useAutoLogin";
import LoginDialog from "./LoginDialog";

export default function LoginButton() {
  const { loading, session, supabase } = useAuth();
  const [showFallback, setShowFallback] = React.useState(false);
  const [showLoginDialog, setShowLoginDialog] = React.useState(false);

  // 🔹 Automatisches Öffnen des Login-Dialogs über ?login=true
  useAutoLogin(() => setShowLoginDialog(true));

  // 🔸 Falls loading länger dauert, Fallback anzeigen
  React.useEffect(() => {
    const t = setTimeout(() => setShowFallback(true), 3000);
    return () => clearTimeout(t);
  }, []);

  // 🔸 Loading-Zustand
  if (loading && !showFallback) {
    return (
      <>
        <button className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600">
          <User className="h-4 w-4" />
          Lädt…
        </button>
        <LoginDialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)} />
      </>
    );
  }

  // 🔸 Wenn kein User eingeloggt ist
  if (!session) {
    return (
      <>
        <button
          onClick={() => setShowLoginDialog(true)}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <LogIn className="h-4 w-4" />
          Login
        </button>
        <LoginDialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)} />
      </>
    );
  }

  // 🔸 Wenn User eingeloggt ist
  return (
    <>
      <div className="flex items-center gap-2">
        <NavLink
          to="/konto"
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <User className="h-4 w-4" />
          Konto
        </NavLink>
        <button
          onClick={async () => await supabase.auth.signOut()}
          className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>

      {/* ⬇️ Hier wird der Dialog am Ende immer mitgerendert */}
      <LoginDialog open={showLoginDialog} onClose={() => setShowLoginDialog(false)} />
    </>
  );
}
