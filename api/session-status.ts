// api/session-status.ts
// Wird einmal pro App-Mount vom SessionTracker (App.tsx) aufgerufen, sobald Clerk
// einen eingeloggten Nutzer bestätigt hat. Prüft/aktualisiert atomar (via Postgres-
// Funktion, siehe sql/2026-09-17_user_sessions.sql) ob das der erste Login bzw. der
// zweite Kalendertag mit einem Login ist, und gibt das zurück -- der Client feuert
// darauf basierend first_login/second_session an GA4. Bewusst ein eigener,
// authentifizierter Endpoint statt eines Clerk-Webhooks: kein neues Webhook-Setup
// im Clerk-Dashboard nötig, nutzt exakt das Auth-Muster von api/analyze/pro.ts.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }

  let userId: string;
  try {
    const payload = await clerkClient.verifyToken(token);
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }

  const { data, error } = await supabase
    .rpc("record_login_and_check_milestones", { p_user_id: userId })
    .single();

  if (error) {
    console.error("session-status RPC error:", error);
    return res.status(500).json({ error: "RPC_FAILED" });
  }

  const row = data as { is_first_login: boolean; is_second_session: boolean };
  return res.status(200).json({
    firstLogin: row.is_first_login,
    secondSession: row.is_second_session,
  });
}
