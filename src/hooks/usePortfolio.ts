import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useUser } from "@clerk/clerk-react";

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

export function usePortfolio() {
  const { user } = useUser();
  const [objects, setObjects] = useState<PortfolioObject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const userId = user?.id;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("portfolio_objects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (err) throw err;
      setObjects(data ?? []);
    } catch (e: any) {
      setError(e.message ?? "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }, [userId]);

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
      const { error: err } = await supabase
        .from("portfolio_objects")
        .insert({ user_id: userId, status: "beobachtung", ...params, updated_at: new Date().toISOString() });
      if (err) throw err;
      await load();
      return true;
    } catch (e: any) {
      setError(e.message ?? "Fehler beim Speichern");
      return false;
    }
  }, [userId, load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    if (!userId) return false;
    setError(null);
    try {
      const { error: err } = await supabase
        .from("portfolio_objects")
        .delete()
        .eq("id", id)
        .eq("user_id", userId);
      if (err) throw err;
      setObjects(prev => prev.filter(o => o.id !== id));
      return true;
    } catch (e: any) {
      setError(e.message ?? "Fehler beim Löschen");
      return false;
    }
  }, [userId]);

  const updateStatus = useCallback(async (id: string, status: string): Promise<boolean> => {
    if (!userId) return false;
    try {
      const { error: err } = await supabase
        .from("portfolio_objects")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId);
      if (err) throw err;
      setObjects(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      return true;
    } catch (e: any) {
      return false;
    }
  }, [userId]);

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
