// src/routes/auth/Logout.tsx
import React from "react";
import { useClerk } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";

export default function Logout() {
  const { signOut } = useClerk();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F1E3D] px-6 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mb-10 flex flex-col items-center">
          <img src="/assets/propora-logo.png" alt="PROPORA" className="h-10 w-auto mb-2" />
          <p className="text-gray-400 text-sm tracking-wide">
            Immotools für smarte Entscheidungen
          </p>
        </div>

        <h1 className="text-white text-2xl font-semibold mb-2">Ausloggen</h1>
        <p className="text-gray-300 mb-8 text-sm">
          Möchtest du dich wirklich von PROPORA abmelden?
        </p>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="space-y-4">
            <button
              onClick={async () => {
                await signOut({ redirectUrl: "/login" });
              }}
              className="w-full rounded-xl bg-[#FCDC45] text-[#0F1E3D] font-semibold py-3 hover:brightness-110 transition-all"
            >
              Jetzt abmelden
            </button>

            <button
              onClick={() => navigate(-1)}
              className="w-full rounded-xl border border-gray-300 text-gray-700 py-3 hover:bg-gray-50 transition-all"
            >
              Abbrechen und zurück
            </button>
          </div>
        </div>

        <p className="mt-6 text-xs text-gray-400">Du kannst dich jederzeit wieder einloggen.</p>
      </div>
    </div>
  );
}
