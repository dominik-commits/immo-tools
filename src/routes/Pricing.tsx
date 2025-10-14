// src/routes/Pricing.tsx
import React from "react";

export default function Pricing() {
  const handleCheckout = async (plan: "basic" | "pro") => {
    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const data = await res.json();
    if (data?.url) {
      window.location.href = data.url;
    } else {
      alert("Fehler beim Starten des Checkouts.");
      console.error(data);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold text-center mb-8">Wähle dein Abo</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="border rounded-2xl p-6 bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Basic</h2>
          <p className="text-gray-600 mb-4">
            Ideal für Einsteiger – Zugriff auf die Quick-Checks und Grundfunktionen.
          </p>
          <p className="text-2xl font-bold mb-6">79 € / Jahr</p>
          <button
            onClick={() => handleCheckout("basic")}
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800"
          >
            Jetzt abonnieren
          </button>
        </div>

        <div className="border rounded-2xl p-6 bg-white shadow-md">
          <h2 className="text-xl font-semibold mb-2">Pro</h2>
          <p className="text-gray-600 mb-4">
            Plus PDF-Export, Vergleich, und Import-Extension für Immo-Scout & Co.
          </p>
          <p className="text-2xl font-bold mb-6">199 € / Jahr</p>
          <button
            onClick={() => handleCheckout("pro")}
            className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800"
          >
            Jetzt abonnieren
          </button>
        </div>
      </div>
    </div>
  );
}
