import { useState, useEffect, useCallback } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";

export type AnalyzerType = "etw" | "mfh" | "efh" | "gewerbe" | "mixeduse";

export interface PortfolioObject {
  id: string;
  user_id: string;
  analyzer_type: AnalyzerType;
  name: string;
  adresse?: string;
  plz?: string;
  kaufpreis?: number;
  status?: string;
  data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PortfolioSummary {
  totalKaufpreis: number;
  totalCashflowMonat: number;
  totalNoi: number;
  avgNoiYield: number;
  objectCount: number;
  byType: Record<AnalyzerType, number>;
}

// SICHERHEITSFIX (2026-09-17): sprach vorher direkt mit dem anon-Key gegen
// Supabase -- ohne Supabase-Auth-Session (dieses Projekt nutzt Clerk) gab es
// keine Moeglichkeit, das per RLS auf den jeweiligen Nutzer einzuschraenken.
// Jetzt ausschliesslich ueber api/portfolio.ts (Clerk-Bearer-Token,
// serverseitig mit clerkClient.verifyToken geprueft, Service-Role-Key erst
// danach). Siehe api/portfolio.ts fuer die volle Begruendung.
export function usePortfolio() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [objects, setObjects] = useState<PortfolioObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id;

  const call = useCallback(async (action: string, payload: Record<string, unknown> = {}) => {
    const token = await getToken();
    const res = await fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action, ...payload }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Anfrage fehlgeschlagen");
    return json;
  }, [getToken]);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { objects: data } = await call("list");
      setObjects(data ?? []);
    } catch (e: any) {
      setError(e.message ?? "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [userId, call]);

  useEffect(() => { load(); }, [load]);

  const save = useCallback(async (params: {
    analyzer_type: AnalyzerType;
    name: string;
    adresse?: string;
    plz?: string;
    kaufpreis?: number;
    data: Record<string, unknown>;
  }): Promise<boolean> => {
    if (!userId) return false;
    setError(null);
    try {
      await call("save", params);
      await load();
      return true;
    } catch (e: any) {
      setError(e.message ?? "Fehler beim Speichern");
      return false;
    }
  }, [userId, call, load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false;
    setError(null);
    try {
      await call("delete", { id });
      setObjects(prev => prev.filter(o => o.id !== id));
      return true;
    } catch (e: any) {
      setError(e.message ?? "Fehler beim Löschen");
      return false;
    }
  }, [userId, call]);

  const updateStatus = useCallback(async (id: string, status: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      await call("updateStatus", { id, status });
      setObjects(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      return true;
    } catch {
      return false;
    }
  }, [userId, call]);

  const summary: PortfolioSummary = {
    totalKaufpreis: objects.reduce((s, o) => s + (o.kaufpreis ?? 0), 0),
    totalCashflowMonat: objects.reduce((s, o) => s + ((o.data.cashflowMonat ?? o.data.monthlyCF ?? 0) as number), 0),
    totalNoi: objects.reduce((s, o) => s + ((o.data.noi ?? 0) as number), 0),
    avgNoiYield: objects.length > 0
      ? objects.reduce((s, o) => s + ((o.data.noiYield ?? 0) as number), 0) / objects.length
      : 0,
    objectCount: objects.length,
    byType: {
      etw: objects.filter(o => o.analyzer_type === "etw").length,
      mfh: objects.filter(o => o.analyzer_type === "mfh").length,
      efh: objects.filter(o => o.analyzer_type === "efh").length,
      gewerbe: objects.filter(o => o.analyzer_type === "gewerbe").length,
      mixeduse: objects.filter(o => o.analyzer_type === "mixeduse").length,
    }
  };

  return { objects, loading, error, save, remove, reload: load, summary, updateStatus };
}
