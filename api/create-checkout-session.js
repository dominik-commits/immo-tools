// api/create-checkout-session.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/**
 * Erwartete Umgebungsvariablen (nur Server, in Vercel gesetzt):
 * - STRIPE_SECRET_KEY         (sk_live_... oder sk_test_...)
 * - PRICE_BASIC_YEARLY        (price_...)
 * - PRICE_PRO_YEARLY          (price_...)
 * - FRONTEND_URL              (https://propora.de)  // optional; Fallback unten
 *
 * Aufruf:
 *  POST /api/create-checkout-session?plan=basic|pro
 *  (alternativ body: { plan: "basic" | "pro" })
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  // Achte darauf, dass diese Version mit deinem Stripe-Dashboard kompatibel ist
  apiVersion: "2024-06-20",
});

/** Kleine Hilfe zum sicheren Lesen von ENVs */
function requiredEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v.trim();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS / Preflight (hilfreich, wenn du später von anderen Origins aufrufst)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).send("Method Not Allowed");
  }

  try {
    // Frontend-URL für Redirects (Fallback auf produktive Domain)
    const FRONTEND = (process.env.FRONTEND_URL || "https://propora.de").replace(/\/+$/, "");

    const planFromQuery = (req.query.plan as string | undefined)?.toLowerCase();
    const planFromBody =
      typeof req.body === "object" && req.body
        ? (String((req.body as any).plan || "").toLowerCase() || undefined)
        : undefined;

    const plan = (planFromQuery || planFromBody || "basic") as "basic" | "pro";

    // Mapping: welcher Stripe-Price gehört zu welchem Plan?
    const priceId =
      plan === "pro"
        ? requiredEnv("PRICE_PRO_YEARLY")
        : requiredEnv("PRICE_BASIC_YEARLY");

    // Stripe-Checkout-Session erzeugen
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      billing_address_collection: "required",
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND}/app?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND}/pricing?canceled=true`,
      metadata: {
        plan,
        source: "immo-analyzer",
      },
    });

    // Für dein Frontend: einfach auf diese URL weiterleiten
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({ url: session.url, id: session.id });
  } catch (err: any) {
    console.error("Create Checkout Session error:", err);
    const message = err?.message ?? "Unknown error";
    return res.status(500).json({ error: message });
  }
}
