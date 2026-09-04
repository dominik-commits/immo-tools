// src/hooks/useEtwProAnalysis.ts
// Lädt die PRO-Bausteine des ETW-Analyzers (Score-Breakdown, Handlungsempfehlung,
// volle 10-Jahres-Projektion, ETF-Vergleich) von /api/analyze/pro (type: "etw").
// Der Endpoint bedient alle vier Analyzer über einen `type`-Discriminator, um auf
// Vercel Hobby innerhalb des 12-Functions-Limits zu bleiben.
//
// Wird nur für Pro-Accounts überhaupt aufgerufen -- für Free-User bleibt `data`
// dauerhaft null, die aufrufende Komponente zeigt stattdessen ProGate-Platzhalter.

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { isPro, type UserPlan } from "./useUserPlan";
import type { EtwProInput, EtwProResult } from "../core/etwCalc";

const DEBOUNCE_MS = 500;

export function useEtwProAnalysis(input: EtwProInput, plan: UserPlan) {
  const { getToken } = useAuth();
  const [data, setData] = useState<EtwProResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputKey = JSON.stringify(input);

  useEffect(() => {
    if (!isPro(plan)) {
      setData(null);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getToken();
        const res = await fetch("/api/analyze/pro", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ type: "etw", ...input }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Analyse fehlgeschlagen (${res.status})`);
        setData(await res.json());
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan, inputKey]);

  return { data, loading, error };
}
