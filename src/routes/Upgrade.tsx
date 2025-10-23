// src/routes/Upgrade.tsx
import React from "react";

export default function Upgrade() {
  return (
    <div className="p-8 text-center">
      <h1 className="text-2xl font-semibold mb-4">Propora Pro freischalten</h1>
      <p className="text-muted-foreground mb-6">199 € pro Jahr, jährliche Abrechnung.</p>
      <a
        href="DEIN_STRIPE_CHECKOUT_LINK" // TODO
        className="bg-[#1b2c47] text-white px-6 py-3 rounded-xl hover:bg-[#253b63] transition"
      >
        Jetzt upgraden
      </a>
    </div>
  );
}
