// /api/stripe/create-checkout-session.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

/**
 * ENV (Vercel → Project Settings → Environment Variables):
 * - STRIPE_SECRET_KEY           (sk_live_... / sk_test_...)
 * - PRICE_BASIC_YEARLY          (price_...)
 * - PRICE_PRO_YEARLY            (price_...)
 * - (optional) PRICE_BASIC_MONTHLY, PRICE_PRO_MONTHLY
 * - APP_PUBLIC_BASE_URL         (https://tools.propora.de)
 */

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

// Mapping der Stripe-Preis-IDs
const PRICE_MAP: Record<string, string | undefined> = {
  "basis:yearly": process.env.PRICE_BASIC_YEARLY,
  "basis:monthly": process.env.PRICE_BASIC_MONTHLY,
  "pro:yearly": process.env.PRICE_PRO_YEARLY,
  "pro:monthly": process.env.PRICE_PRO_MONTHLY,
};

function pickPriceId(plan: "basis" | "pro", interval: "yearly" | "monthly"): string {
  const id = PRICE_MAP[`${plan}:${interval}`] || PRICE_MAP[`${plan}:yearly`];
  if (!id) {
    throw new Error(`Price-ID fehlt für ${plan}/${interval} – bitte ENV setzen.`);
  }
  return id;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const method = req.method || "GET";
    if (method !== "GET" && method !== "POST") {
      res.setHeader("Allow", "GET, POST");
      return res.status(405).json({ error: "Method Not Allowed" });
    }

    const body =
      method === "POST" && req.body && typeof req.body === "object" ? req.body : {};
    const qp = req.query || {};

    const plan = (qp.plan || body.plan || "pro") as "basis" | "pro";
    const interval = (qp.interval || body.interval || "yearly") as "yearly" | "monthly";

    // Clerk-User-ID (zwingend erforderlich)
    const clerkUserId =
      (qp.userId as string) ||
      (body.userId as string) ||
      undefined;

    if (!clerkUserId) {
      return res.status(400).json({ error: "Missing clerkUserId" });
    }

    // Optionale E-Mail, nur für Rechnungen & Convenience
    const appEmail =
      (qp.email as string) ||
      (body.email as string) ||
      undefined;

    const priceId = pickPriceId(plan, interval);

    const baseUrl =
      process.env.APP_PUBLIC_BASE_URL || `https://${req.headers.host}`;
    const successUrl = `${baseUrl}/?checkout=success`;
    const cancelUrl = `${baseUrl}/preise`;

    // 🔑 WICHTIG:
    // - metadata.* → liegt auf der Checkout-Session
    // - subscription_data.metadata.* → landet auf der Stripe-Subscription
    const commonMetadata = {
      clerkUserId,
      plan,
      interval,
      appEmail: appEmail ?? "",
    };

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,

      client_reference_id: clerkUserId,
      metadata: commonMetadata,

      subscription_data: {
        metadata: commonMetadata,
      },

      customer_email: appEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    // 303 Redirect auf die Stripe-Checkout-URL
    res.setHeader("Location", session.url as string);
    return res.status(303).end();
  } catch (err: any) {
    console.error("create-checkout-session error:", err?.message, err);
    return res.status(500).json({ error: err?.message || "Failed to create session" });
  }
}
