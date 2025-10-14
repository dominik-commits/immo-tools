// Öffnet das Stripe-Kundenportal (Abo verwalten, Zahlungsmittel, Rechnungen)

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

const PORTAL_RETURN_URL =
  process.env.STRIPE_PORTAL_RETURN_URL || "http://localhost:5173/app";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { customerId } = (req.body || {}) as { customerId?: string };

    if (!customerId) {
      return res.status(400).json({ error: "customerId required (store it after Checkout)" });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: PORTAL_RETURN_URL,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error("portal error", err);
    return res.status(500).json({ error: err.message ?? "Stripe error" });
  }
}
