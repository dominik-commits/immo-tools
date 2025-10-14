// Vercel Serverless Function (Node.js)
// Erstellt eine Stripe Checkout-Session für Abo (jährlich)

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

const PRICE_BASIC = process.env.PRICE_BASIC_YEARLY as string; // z.B. price_...
const PRICE_PRO = process.env.PRICE_PRO_YEARLY as string;     // z.B. price_...

const FRONTEND_URL =
  process.env.FRONTEND_URL || "http://localhost:5173"; // deine App-URL (prod: https://deinedomain.tld)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { plan = "basic", email } = (req.body || {}) as { plan?: "basic" | "pro"; email?: string };

    const priceId = plan === "pro" ? PRICE_PRO : PRICE_BASIC;
    if (!priceId) return res.status(400).json({ error: "Unknown price for plan" });

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${FRONTEND_URL}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/pricing?checkout=cancel`,
      customer_email: email, // optional: prefills email
      automatic_tax: { enabled: true },
      billing_address_collection: "auto",
      metadata: { plan },
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("checkout error", err);
    return res.status(500).json({ error: err.message ?? "Stripe error" });
  }
}
