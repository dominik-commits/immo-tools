/**
 * useUrlPrefill
 * Liest URL-Parameter aus (gesetzt von der PROPORA Chrome Extension)
 * und gibt vorausgefüllte Werte zurück.
 *
 * Verwendung in jedem Analyzer:
 *
 *   const prefill = useUrlPrefill();
 *
 *   // States mit Prefill initialisieren:
 *   const [kaufpreis, setKaufpreis] = useState(prefill.kaufpreis ?? 350_000);
 *   const [flaecheM2, setFlaecheM2] = useState(prefill.flaeche ?? 70);
 *   const [plz, setPlz]             = useState(prefill.plz ?? "");
 *   const [adresse, setAdresse]      = useState(prefill.adresse ?? "");
 *
 *   // WICHTIG: useEffect für nachträgliches Setzen falls States schon gemountet:
 *   useEffect(() => {
 *     if (!prefill.hasPrefill) return;
 *     if (prefill.kaufpreis) setKaufpreis(prefill.kaufpreis);
 *     if (prefill.flaeche)   setFlaecheM2(prefill.flaeche);
 *     if (prefill.plz)       setPlz(prefill.plz);
 *     if (prefill.adresse)   setAdresse(prefill.adresse);
 *   }, [prefill.hasPrefill]);
 */

import { useMemo } from "react";

export interface UrlPrefill {
  kaufpreis:  number | null;
  kaltmiete:  number | null;
  flaeche:    number | null;
  zimmer:     number | null;
  plz:        string | null;
  adresse:    string | null;
  baujahr:    number | null;
  hausgeld:   number | null;
  source:     string | null;
  exposeUrl:  string | null;
  hasPrefill: boolean;
}

function parseNum(val: string | null): number | null {
  if (!val) return null;
  const n = parseFloat(val.replace(",", "."));
  return isFinite(n) && n > 0 ? n : null;
}

export function useUrlPrefill(): UrlPrefill {
  return useMemo(() => {
    // Read directly from window.location to avoid React Router timing issues
    const params = new URLSearchParams(window.location.search);

    const kaufpreis  = parseNum(params.get("kaufpreis"));
    const kaltmiete  = parseNum(params.get("kaltmiete"));
    const flaeche    = parseNum(params.get("flaeche"));
    const zimmer     = parseNum(params.get("zimmer"));
    const baujahr    = parseNum(params.get("baujahr"));
    const hausgeld   = parseNum(params.get("hausgeld"));
    const plz        = params.get("plz") || null;
    const adresse    = params.get("adresse") || null;
    const source     = params.get("source") || null;
    const exposeUrl  = params.get("exposeUrl") || null;

    const hasPrefill = !!(kaufpreis || kaltmiete || flaeche || plz);

    return { kaufpreis, kaltmiete, flaeche, zimmer, plz, adresse, baujahr, hausgeld, source, exposeUrl, hasPrefill };
  }, []); // empty deps: read once on mount from actual URL
}
