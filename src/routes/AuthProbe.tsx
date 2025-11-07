// src/routes/AuthProbe.tsx
import React from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthProbe() {
  const [info, setInfo] = React.useState<any>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        setInfo({
          url: import.meta.env.VITE_SUPABASE_URL,
          anon: import.meta.env.VITE_SUPABASE_ANON_KEY ? "✅ present" : "❌ missing",
          session: session?.session ?? null,
        });
      } catch (e: any) {
        setInfo({ error: e.message });
      }
    })();
  }, []);

  return (
    <div className="p-6 font-mono text-sm">
      <h1 className="mb-4 text-lg font-bold">Auth Debug Info</h1>
      <pre className="rounded-lg bg-gray-50 p-4">
        {JSON.stringify(info, null, 2)}
      </pre>
    </div>
  );
}
