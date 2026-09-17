// api/portfolio.ts
// SICHERHEITSFIX (2026-09-17): portfolio_objects wurde bisher direkt vom Client
// mit dem oeffentlichen anon-Key angesprochen (src/hooks/usePortfolio.ts), OHNE
// jede serverseitige Identitaetspruefung -- die App nutzt Clerk, nicht Supabase
// Auth, es gibt also kein JWT, das RLS ueber auth.uid() haette auswerten koennen.
// user_id-Filterung war rein client-seitig (nur ein WHERE-Vorschlag), von jedem
// mit dem anon-Key umgehbar. Bestaetigt per echtem Test-Request: anon-Key konnte
// alle Nutzerdaten lesen UND beliebige Zeilen mit fremder user_id einschleusen.
//
// Fix: ALLE Zugriffe auf portfolio_objects laufen jetzt ausschliesslich ueber
// diesen einen authentifizierten Endpoint (Clerk-Bearer-Token, gleiches Muster
// wie api/analyze/pro.ts und api/session-status.ts) mit dem Service-Role-Key.
// RLS auf der Tabelle blockt seitdem jeden Direktzugriff via anon/authenticated
// vollstaendig -- nur service_role kommt noch durch (umgeht RLS by design).
//
// Ein Endpoint mit action-Discriminator statt vier separaten Dateien: Vercel
// Hobby erlaubt nur 12 Serverless Functions, 11 waren bereits belegt (siehe
// api/analyze/pro.ts fuer denselben Grund/dasselbe Muster).
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

const VALID_ANALYZER_TYPES = ["etw", "mfh", "efh", "gewerbe", "mixeduse"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: "UNAUTHENTICATED" });

  let userId: string;
  try {
    const payload = await clerkClient.verifyToken(token);
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }

  const { action, ...body } = req.body || {};

  switch (action) {
    case "list": {
      const { data, error } = await supabase
        .from("portfolio_objects")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) return res.status(500).json({ error: "LIST_FAILED" });
      return res.status(200).json({ objects: data ?? [] });
    }

    case "save": {
      const { analyzer_type, name, adresse, plz, kaufpreis, data: objData } = body;
      if (!VALID_ANALYZER_TYPES.includes(analyzer_type) || typeof name !== "string" || !name) {
        return res.status(400).json({ error: "INVALID_PAYLOAD" });
      }
      const { error } = await supabase.from("portfolio_objects").insert({
        user_id: userId, // NIE aus dem Client-Payload uebernehmen -- immer der verifizierte Token
        status: "beobachtung",
        analyzer_type,
        name,
        adresse,
        plz,
        kaufpreis,
        data: objData ?? {},
        updated_at: new Date().toISOString(),
      });
      if (error) return res.status(500).json({ error: "SAVE_FAILED" });
      return res.status(200).json({ ok: true });
    }

    case "delete": {
      const { id } = body;
      if (typeof id !== "string" || !id) return res.status(400).json({ error: "INVALID_PAYLOAD" });
      const { error } = await supabase
        .from("portfolio_objects")
        .delete()
        .eq("id", id)
        .eq("user_id", userId); // Scoping bleibt: Nutzer kann nur eigene Zeilen loeschen
      if (error) return res.status(500).json({ error: "DELETE_FAILED" });
      return res.status(200).json({ ok: true });
    }

    case "updateStatus": {
      const { id, status } = body;
      if (typeof id !== "string" || !id || typeof status !== "string" || !status) {
        return res.status(400).json({ error: "INVALID_PAYLOAD" });
      }
      const { error } = await supabase
        .from("portfolio_objects")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("user_id", userId);
      if (error) return res.status(500).json({ error: "UPDATE_FAILED" });
      return res.status(200).json({ ok: true });
    }

    default:
      return res.status(400).json({ error: "INVALID_ACTION" });
  }
}
