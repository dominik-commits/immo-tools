// api/create-checkout-session.js
import Stripe from "stripe";

/**
 * Vercel Serverless Function (Node.js) – ESM
 * POST /api/create-checkout-session
 * Body: { plan: "basic" | "pro" }
 */
export default async function handler(req, res) {
  // Nur POST erlauben
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { plan } = req.body || {};
    if (!plan || !["basic", "pro"].includes(plan)) {
      res.status(400).json({ error: "Missing or invalid plan" });
      return;
    }

    // ENV-Variablen (in Vercel → Project Settings → Environment Variables)
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const priceBasic = process.env.PRICE_BASIC_YEARLY;
    const pricePro = process.env.PRICE_PRO_YEARLY;
    const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL || "https://propora.de/app";

    if (!secretKey || !priceBasic || !pricePro) {
      res.status(500).json({ error: "Server not configured (Stripe env missing)" });
      return;
    }

    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

    const priceId = plan === "basic" ? priceBasic : pricePro;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${returnUrl}?checkout=success`,
      cancel_url: `${returnUrl}?checkout=cancel`,
      billing_address_collection: "auto",
      subscription_data: {
        metadata: { plan },
      },
      // Optional: Customer creation
      // customer_email: ... // wenn du schon eine E-Mail hast
    });

    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Stripe error" });
  }
}
