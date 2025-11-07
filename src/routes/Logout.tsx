// src/routes/Logout.tsx
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthProvider";

export default function Logout() {
  const { supabase } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn("[logout] signOut error", e);
      } finally {
        const next = new URLSearchParams(location.search).get("next") || "/";
        navigate(`/login?next=${encodeURIComponent(next)}`, { replace: true });
      }
    })();
  }, [supabase, navigate, location.search]);

  return (
    <div style={{ display: "grid", placeItems: "center", height: "100dvh", fontFamily: "system-ui" }}>
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Abmelden…</div>
        <div style={{ color: "#6b7280" }}>Bitte einen Moment.</div>
      </div>
    </div>
  );
}
