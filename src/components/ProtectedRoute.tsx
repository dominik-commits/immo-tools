import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth, NEXT_AFTER_LOGIN } from "@/contexts/AuthProvider";
import { LoadingScreen } from "@/App";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    // Ziel merken, um nach Login zurückzuschicken
    localStorage.setItem(NEXT_AFTER_LOGIN, loc.pathname + loc.search);
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
