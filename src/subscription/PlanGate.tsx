// src/subscription/PlanGate.tsx
import React from 'react';
import { hasAccess, type Feature } from './featureGating';

type Props = {
  plan: 'basic' | 'pro' | null;
  feature: Feature;
  children: React.ReactNode;
  onUpgradeClick?: () => void;
};

export function PlanGate({ plan, feature, children, onUpgradeClick }: Props) {
  if (hasAccess(plan, feature)) return <>{children}</>;

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="font-medium mb-2">Dieses Modul ist in deinem Plan nicht enthalten.</div>
      <div className="text-sm mb-3">
        Du benötigst den <b>IMMO Analyzer Pro</b>, um dieses Tool zu nutzen.
      </div>
      <button
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 bg-black text-white"
        onClick={onUpgradeClick}
      >
        Jetzt auf Pro upgraden (199 €/Jahr)
      </button>
    </div>
  );
}
