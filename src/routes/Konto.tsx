import React from "react";
import { useAuth } from "@/contexts/AuthProvider";

export default function Konto() {
  const { user, signOut, loading } = useAuth();

  if (loading) return <div className="p-6">Lade…</div>;
  if (!user) return (
    <div className="p-6">
      <h1 className="mb-2 text-xl font-semibold">Bitte einloggen</h1>
      <p>Du benötigst ein Konto, um deine Rechnungen & Abo-Infos zu sehen.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-2 text-2xl font-bold">Mein Konto</h1>
      <p className="text-sm text-gray-600">E-Mail: {user.email}</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">Abo / Plan</h2>
          <p className="text-sm text-gray-600">
            Der aktuelle Plan wird serverseitig in deiner <code>users</code>-Tabelle gepflegt.
          </p>
          <p className="mt-2 text-sm">👉 Nächster Schritt: Plan + Rechnungen hier anzeigen.</p>
        </div>

        <div className="rounded-lg border p-4">
          <h2 className="mb-2 font-semibold">Rechnungen</h2>
          <p className="text-sm text-gray-600">Platzhalter – später Stripe Customer Portal oder eigene Liste.</p>
        </div>
      </div>

      <button onClick={signOut} className="mt-6 rounded bg-gray-800 px-4 py-2 text-white hover:bg-black">
        Logout
      </button>
    </div>
  );
}
