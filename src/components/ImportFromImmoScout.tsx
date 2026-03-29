// src/components/ImportFromImmoPortal.tsx
// Import aus allen Immo-Portalen (ImmoScout, Immowelt, Immonet, eBay Kleinanzeigen)
// Funktioniert mit Mock-Daten + echtem Scraper (falls vorhanden)

import React, { useState } from "react";
import { Download, Lock, X, Loader2 } from "lucide-react";
import type { ImmoImportResponse } from "@/types/immoImport";

type PlanId = "basis" | "pro";

type Props = {
  plan: PlanId;
  onImported?: (payload: ImmoImportResponse) => void;
};

type ImportState = "idle" | "loading" | "success" | "error";

const ImportFromImmoPortal: React.FC<Props> = ({ plan, onImported }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [state, setState] = useState<ImportState>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isPro = plan === "pro";

  // API-Basis bestimmen
  const API_BASE =
    (import.meta as any).env?.VITE_API_URL || window.location.origin;

  function normalizeBase(url: string) {
    return url.replace(/\/$/, "");
  }

  function openModal() {
    setIsOpen(true);
    setState("idle");
    setErrorMsg(null);
    setUrl("");
  }

  async function handleImport(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;

    setState("loading");
    setErrorMsg(null);

    try {
      const token = (window as any)?.__PROPORA_TOKEN__ ?? null;

      const endpoint = normalizeBase(API_BASE) + "/api/extension/import";

      console.log("[Immo-Import] Call:", endpoint);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = (await res.json().catch(() => null)) as
        | ImmoImportResponse
        | { ok?: boolean; error?: string; message?: string }
        | null;

      if (!res.ok || !data || data.ok === false) {
        console.error("[Immo-Import] Fehler:", res.status, data);
        setState("error");
        setErrorMsg(
          (data as any)?.error ||
            (data as any)?.message ||
            "Import fehlgeschlagen. Bitte später erneut versuchen."
        );
        return;
      }

      const payload = data as ImmoImportResponse;
      console.log("[Immo-Import] SUCCESS:", payload);

      setState("success");

      if (onImported) onImported(payload);
    } catch (err) {
      console.error("[Immo-Import] Unerwarteter Fehler", err);
      setState("error");
      setErrorMsg("Unerwarteter Fehler beim Import.");
    }
  }

  return (
    <>
      {/* Trigger-Button */}
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-card text-sm shadow-sm hover:shadow"
      >
        <Download className="h-4 w-4" />
        <span>Von Immo-Portal importieren</span>
      </button>

      {/* MODAL */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal Box */}
          <div className="relative z-50 w-full max-w-md rounded-2xl bg-card border shadow-xl p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold flex items-center gap-2">
                {isPro
                  ? "Exposé aus Immo-Portal importieren"
                  : "PRO-Feature"}
              </h3>
              <button
                className="text-muted-foreground hover:text-slate-900"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* === BASIS-USER (Upsell) === */}
            {!isPro ? (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                  <Lock className="h-4 w-4" />
                  <span>
                    Der Browser-Import ist ein Feature von Propora PRO.
                  </span>
                </div>
                <p className="text-muted-foreground">
                  Mit Propora PRO kannst du Exposés aus <b>ImmoScout</b>,
                  <b> Immowelt</b>, <b>Immonet</b> und
                  <b> eBay Kleinanzeigen</b> per URL übernehmen – ohne
                  manuelles Abtippen.
                </p>
                <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1">
                  <li>Automatische Übernahme von Kaufpreis & Flächen</li>
                  <li>Zonen & Mieten sofort im Analyzer</li>
                  <li>Weniger Fehler, schnellerer Deal-Check</li>
                </ul>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    className="px-3 py-1.5 rounded-lg border text-sm"
                    onClick={() => setIsOpen(false)}
                  >
                    Später
                  </button>
                  <a
                    href="/preise"
                    className="px-3 py-1.5 rounded-lg text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110"
                  >
                    Jetzt upgraden
                  </a>
                </div>
              </div>
            ) : (
              // === PRO: URL-FORMULAR ===
              <form onSubmit={handleImport} className="space-y-4 text-sm">
                <p className="text-muted-foreground">
                  Füge hier die Exposé-URL ein. Propora erkennt das Portal
                  und übernimmt automatisch die Daten.
                </p>

                <label className="block text-sm">
                  <span className="text-foreground">Exposé-URL</span>
                  <input
                    type="url"
                    required
                    placeholder="https://www.immobilienscout24.de/expose/123456789"
                    className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                  />
                </label>

                {/* ERROR */}
                {state === "error" && errorMsg && (
                  <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">
                    {errorMsg}
                  </div>
                )}

                {/* SUCCESS */}
                {state === "success" && (
                  <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    Import erfolgreich – Daten wurden an den Analyzer
                    übergeben.
                  </div>
                )}

                {/* ACTIONS */}
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-lg border text-sm"
                    onClick={() => setIsOpen(false)}
                    disabled={state === "loading"}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 inline-flex items-center gap-2 disabled:opacity-60"
                    disabled={state === "loading"}
                  >
                    {state === "loading" && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}
                    Import starten
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ImportFromImmoPortal;
