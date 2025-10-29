import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useUserPlan() {
  const [plan, setPlan] = useState<"basis" | "pro" | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      const { data: { session } } = await supabase.auth.getSession();
      const email = session?.user?.email;
      if (!email) { if (mounted) setPlan(null); return; }

      const { data, error } = await supabase
        .from("users")
        .select("plan")
        .eq("email", email.toLowerCase())
        .maybeSingle();

      if (!mounted) return;
      if (error) { console.warn("useUserPlan:", error.message); setPlan(null); return; }

      setPlan((data?.plan === "pro") ? "pro" : "basis");
    }

    run();
    const { data: sub } = supabase.auth.onAuthStateChange(() => run());
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  return plan; // null = unbekannt/kein Login
}
