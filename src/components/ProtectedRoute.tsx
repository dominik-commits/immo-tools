// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { Lock, ArrowRight, LogIn } from "lucide-react";
import { useAuth } from "../contexts/AuthProvider";
import { useUserPlan } from "../hooks/useUserPlan";

/** Externe Preise-Seite (Marketing) */
const EXTERNAL_PRICING =
  (window as any)?.__PRICING_URL__ || "https://propora.de/preise";

type Plan = "basis" | "pro";
type Props = {
  /** Erforderlicher Plan für diese Route */
  requiredPlan: Plan;
  /** Kinder werden nur gerendert, wenn Bedingungen erfüllt sind */
  children: React.ReactNode;
};

/**
 * ProtectedRoute
 * - erzwingt Login
 * - prüft Abo-Plan (basis/pro)
 * - zeigt freundliche Gate-Screens (Login / Upgrade)
 */
export default function ProtectedRoute({ requiredPlan, children }: Props) {
  const { session, loading } = useAuth();
  const plan = useUserPlan(); // 'basis' | 'pro' | null (loading)
  const location = useLocation();

  // 1) Auth-State lädt → Placeholder
  if (loading || plan === null) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="mb-3 h-5 w-40 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-72 animate-pulse rounded bg-gray-100" />
        </div>
      </main>
    );
  }

  // 2) Nicht eingeloggt → Login-Gate
  if (!session) {
    return <LoginGate redirectTo={`${location.pathname}${location.search}`} />;
  }

  // 3) Eingeloggt aber Plan unzureichend → Upgrade-Gate
  if (requiredPlan === "pro" && plan !== "pro") {
    return <UpgradeGate />;
  }

  // 4) Alles okay → Inhalt anzeigen
  return <>{children}</>;
}

/* -------------------------- UI Gates -------------------------- */

function LoginGate({ redirectTo }: { redirectTo: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
          <Lock className="h-4 w-4" /> Geschützter Bereich
        </div>
        <h1 className="text-xl font-bold text-gray-900">
          Bitte einloggen, um fortzufahren
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Du benötigst einen aktiven PROPORA-Zugang. Logge dich ein oder
          sichere dir deinen Zugang auf der Preise-Seite.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            to={`/login?next=${encodeURIComponent(redirectTo)}`}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <LogIn className="h-4 w-4" />
            Einloggen
          </Link>

          <a
            href={EXTERNAL_PRICING}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-[#0F2C8A] px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Zugang kaufen <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </main>
  );
}

function UpgradeGate() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <Lock className="h-4 w-4" /> Nur in PRO
        </div>
        <h1 className="text-xl font-bold text-gray-900">Upgrade auf PRO</h1>
        <p className="mt-1 text-sm text-gray-600">
          Dieses Modul ist Teil des PRO-Pakets. Upgrade jetzt und schalte alle
          PRO-Funktionen frei.
        </p>

        <div className="mt-5">
          <a
            href={EXTERNAL_PRICING}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Jetzt auf PRO upgraden <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </main>
  );
}
