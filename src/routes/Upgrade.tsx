// src/routes/Upgrade.tsx
import React from "react";
import { Link } from "react-router-dom";
import PlanGuard from "@/components/PlanGuard";

export default function Upgrade() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface text-foreground">
      <div className="max-w-md text-center p-8 rounded-2xl border bg-card shadow-soft">
        <h1 className="text-2xl font-semibold mb-2">Upgrade auf PRO</h1>
        <p className="text-muted-foreground mb-4">
          Mit dem <strong>Pro-Paket</strong> erhältst du Zugriff auf alle Tools –
          inklusive Gewerbe, Vergleich, Afa und erweiterte Finanzierung.
        </p>

        <div className="space-y-2">
          <Link
            to="/preise"
            className="inline-block w-full px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 transition"
          >
            Jetzt Upgrade anzeigen
          </Link>
          <PlanGuard required="pro">
            <p className="text-xs text-muted-foreground mt-2">
              (Wenn du bereits PRO bist, kannst du alle Tools direkt öffnen.)
            </p>
          </PlanGuard>
        </div>
      </div>
    </div>
  );
}
