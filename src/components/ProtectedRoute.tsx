import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, NEXT_AFTER_LOGIN } from "@/contexts/AuthProvider";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <div className="p-6">Lade…</div>;

  if (!user) {
    // Ziel merken, um nach Login zurückzuschicken
    localStorage.setItem(NEXT_AFTER_LOGIN, loc.pathname + loc.search);
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
