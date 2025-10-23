// src/routes/Checkout.tsx
import React, { useEffect, useState } from "react";

export default function Checkout() {
  const [message, setMessage] = useState<string>("Starte Checkout ...");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    // Falls dein Backend "basis" statt "basic" erwartet, hier entsprechend anpassen:
    const plan = (params.get("plan") as "basis" | "pro") || "basic";

    const go = async () => {
      try {
        const origin = window.location.origin;
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            successUrl: `${origin}/?checkout=success`,
            cancelUrl: `${origin}/pricing?checkout=cancel`,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
        const data = await res.json();
        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error("Antwort ohne URL.");
        }
      } catch (err: any) {
        setMessage(`Fehler beim Start: ${err?.message ?? String(err)}`);
      }
    };

    go();
  }, []);

  return (
    <div className="max-w-xl mx-auto rounded-2xl border bg-card p-6">
      <h1 className="text-lg font-semibold mb-2">Kasse</h1>
      <p className="text-muted-foreground">{message}</p>
      <p className="text-xs text-gray-400 mt-4">
        Wenn nichts passiert, lade die Seite neu oder gehe zurück zur{" "}
        <a className="underline" href="/pricing">Preisliste</a>.
      </p>
    </div>
  );
}
