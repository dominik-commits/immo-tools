// src/components/ProtectedRoute.tsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthProvider";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <div className="p-6 text-sm text-gray-600">
        Lädt …
      </div>
    );
  }

  if (!session) {
    // Kein Login → öffne Login via Query-Flag
    return <Navigate to="/?login=true" replace />;
  }

  return <>{children}</>;
}
