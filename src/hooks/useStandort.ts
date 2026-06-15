/**
 * useStandort – lädt Standortdaten aus standortDaten.json per PLZ
 * Gibt Marktdaten + Score zurück, oder null wenn PLZ unbekannt
 */

import { useState, useEffect } from "react";

export interface StandortInfo {
  stadt: string;
  kaufpreis_m2: number;
  miete_m2: number;
  rendite_brutto: number;
  score: number;
  scoreLabel: "attraktiv" | "durchschnitt" | "schwach";
  scoreColor: string;
  faktor: number;
}

let cache: Record<string, { s: string; k: number; m: number; r: number }> | null = null;

async function loadData(): Promise<Record<string, { s: string; k: number; m: number; r: number }>> {
  if (cache) return cache;
  const res = await fetch("/data/standortDaten.json");
  const json = await res.json();
  cache = json.plz;
  return cache!;
}

function calcScore(k: number, m: number, r: number): { score: number; label: "attraktiv"|"durchschnitt"|"schwach"; color: string } {
  const renditeScore = Math.min(10, Math.max(0, (r - 0.02) / 0.04 * 10));
  const faktor = k / (m * 12);
  const faktorScore = Math.min(10, Math.max(0, (35 - faktor) / 10 * 10));
  const nachfrageScore = Math.min(10, Math.max(0, (m - 5) / 10 * 10));
  const total = renditeScore * 0.5 + faktorScore * 0.3 + nachfrageScore * 0.2;
  const score = Math.round(total * 10);
  const label = score >= 70 ? "attraktiv" : score >= 45 ? "durchschnitt" : "schwach";
  const color = score >= 70 ? "#4ade80" : score >= 45 ? "#FCDC45" : "#f87171";
  return { score, label, color };
}

export function useStandort(plz: string) {
  const [info, setInfo] = useState<StandortInfo | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (plz.length !== 5) {
      setInfo(null);
      setNotFound(false);
      return;
    }

    setLoading(true);
    loadData().then(data => {
      const d = data[plz];
      if (d) {
        const { score, label, color } = calcScore(d.k, d.m, d.r);
        setInfo({
          stadt: d.s,
          kaufpreis_m2: d.k,
          miete_m2: d.m,
          rendite_brutto: d.r,
          score,
          scoreLabel: label,
          scoreColor: color,
          faktor: Math.round(d.k / (d.m * 12) * 10) / 10,
        });
        setNotFound(false);
      } else {
        setInfo(null);
        setNotFound(true);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [plz]);

  return { info, notFound, loading };
}
