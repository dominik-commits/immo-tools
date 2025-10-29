// src/components/LoginButton.tsx
import React from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthProvider";

export default function LoginButton() {
  const nav = useNavigate();
  const { session, loading, signInWithEmail, signOut } = useAuth();

  const onLogin = async () => {
    // super lightweight email prompt for now
    const email = window.prompt("Bitte E-Mail eingeben für Login (Magic Link):");
    if (!email) return;
    try {
      await signInWithEmail(email);
      alert("Check deine E-Mails – Magic Link gesendet.");
    } catch (e: any) {
      alert(`Login fehlgeschlagen: ${e?.message || e}`);
    }
  };

  if (loading) {
    return (
      <button
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-500"
        disabled
      >
        <User className="h-4 w-4" />
        Lädt…
      </button>
    );
  }

  // No session -> Login
  if (!session) {
    return (
      <button
        onClick={onLogin}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <LogIn className="h-4 w-4" />
        Login
      </button>
    );
  }

  // Session -> Konto + Logout
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => nav("/konto")}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <User className="h-4 w-4" />
        Konto
      </button>
      <button
        onClick={async () => {
          await signOut();
          // keep user on page; header switches back to "Login"
        }}
        className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <LogOut className="h-4 w-4" />
        Logout
      </button>
    </div>
  );
}
