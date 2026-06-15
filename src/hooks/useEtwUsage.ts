/**
 * useEtwUsage – monatliches Nutzungslimit für den ETW-Analyzer (Free-User)
 * Speichert in localStorage: { count: number, month: "YYYY-MM" }
 * Zählt +1 wenn Kaufpreis geändert wird (debounced, 2s)
 */

import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "propora_etw_usage";
const MONTHLY_LIMIT = 10;

interface UsageData {
  count: number;
  month: string;
}

function getCurrentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function readUsage(): UsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, month: getCurrentMonth() };
    const parsed = JSON.parse(raw) as UsageData;
    // Monatswechsel → reset
    if (parsed.month !== getCurrentMonth()) {
      return { count: 0, month: getCurrentMonth() };
    }
    return parsed;
  } catch {
    return { count: 0, month: getCurrentMonth() };
  }
}

function writeUsage(data: UsageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export function useEtwUsage(isFreeUser: boolean) {
  const [usage, setUsage] = useState<UsageData>(() => readUsage());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastKaufpreisRef = useRef<number | null>(null);

  // Sync usage on mount
  useEffect(() => {
    setUsage(readUsage());
  }, []);

  const isLimitReached = isFreeUser && usage.count >= MONTHLY_LIMIT;
  const remaining = Math.max(0, MONTHLY_LIMIT - usage.count);

  /**
   * Aufruf bei jeder Kaufpreis-Änderung.
   * Zählt +1 nach 2s Debounce wenn Kaufpreis sich geändert hat.
   */
  const trackKaufpreis = useCallback(
    (kaufpreis: number) => {
      if (!isFreeUser) return; // Paid users: never track

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        // Nur zählen wenn sich der Kaufpreis tatsächlich geändert hat
        if (lastKaufpreisRef.current === kaufpreis) return;
        lastKaufpreisRef.current = kaufpreis;

        setUsage((prev) => {
          const current = readUsage(); // Fresh read to avoid stale closure
          if (current.count >= MONTHLY_LIMIT) return current; // Already at limit
          const updated: UsageData = {
            count: current.count + 1,
            month: getCurrentMonth(),
          };
          writeUsage(updated);
          return updated;
        });
      }, 2000);
    },
    [isFreeUser]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return {
    usage,
    isLimitReached,
    remaining,
    trackKaufpreis,
    MONTHLY_LIMIT,
  };
}
