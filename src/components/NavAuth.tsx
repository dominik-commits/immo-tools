// src/components/NavAuth.tsx
import React from "react";
import { useAuth } from "../contexts/AuthProvider";

export default function NavAuth() {
  const { loading, user } = useAuth();

  if (loading) return <span className="text-xs text-gray-500">Lädt…</span>;
  if (!user) return <span className="text-xs text-gray-500">Gast</span>;

  return <span className="text-xs text-gray-700">{user.email}</span>;
}
