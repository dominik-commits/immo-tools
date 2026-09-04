// api/stripe/portal.ts
// Öffnet das Stripe-Kundenportal (Rechnungen einsehen, Zahlungsmethode ändern,
// Abo kündigen). Ersetzt die alte portal.js, die zwei echte Probleme hatte:
// 1) Keine Auth-Prüfung -- jeder konnte eine beliebige E-Mail posten und bekam
//    (falls die E-Mail zufällig zu einem Kunden passte) einen Portal-Link für
//    dessen Abo. Jetzt wird wie bei allen anderen /api/*-Routen der Clerk-Token
//    verifiziert und die stripe_customer_id ausschließlich für den daraus
//    ermittelten eigenen User geladen.
// 2) Sie las aus einer "users"-Tabelle, in die nirgends im Code geschrieben
//    wird (die echte Zuordnung stripe_customer_id -> User pflegt der Webhook in
//    "user_plans", siehe api/webhooks/stripe.ts) -- die Abfrage konnte also nie
//    etwas finden.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

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

  try {
    const { data, error } = await supabase
      .from("user_plans")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    if (!data?.stripe_customer_id) {
      return res.status(404).json({ error: "NO_STRIPE_CUSTOMER" });
    }

    const returnUrl =
      (req.body?.return_url as string | undefined) ||
      process.env.APP_PUBLIC_BASE_URL ||
      "https://tools.propora.de/account";

    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: returnUrl,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("portal error:", err?.message || err);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
}
