// src/subscription/usePlan.ts
import { useEffect, useState } from 'react';
import type { Plan } from './featureGating';

export function usePlan(email: string | null) {
  const [plan, setPlan] = useState<Plan>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) return;
    setLoading(true);
    fetch(`/api/me?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then((d) => setPlan((d?.plan ?? null) as Plan))
      .finally(() => setLoading(false));
  }, [email]);

  return { plan, loading };
}
