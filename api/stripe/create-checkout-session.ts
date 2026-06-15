// /api/stripe/create-checkout-session.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

const PRICE_MAP: Record<string, string | undefined> = {
  "basis:yearly": process.env.PRICE_BASIC_YEARLY,
  "basis:monthly": process.env.PRICE_BASIC_MONTHLY,
  "pro:yearly": process.env.PRICE_PRO_YEARLY,
  "pro:monthly": process.env.PRICE_PRO_MONTHLY,
};

function pickPriceId(plan: "basis" | "pro", interval: "yearly" | "monthly"): string {
  const id = PRICE_MAP[`${plan}:${interval}`] || PRICE_MAP[`${plan}:yearly`];
  if (!id) {
    throw new Error(`Price-ID fehlt fuer ${plan}/${interval} - bitte ENV setzen.`);
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

    const clerkUserId =
      (qp.userId as string) ||
      (body.userId as string) ||
      undefined;

    // clerkUserId ist optional – nicht-eingeloggte User können direkt zahlen

    const appEmail =
      (qp.email as string) ||
      (body.email as string) ||
      undefined;

    const priceId = pickPriceId(plan, interval);

    const baseUrl =
      process.env.APP_PUBLIC_BASE_URL || `https://${req.headers.host}`;

    const successUrl = `${baseUrl}/?checkout=success&plan=${plan}`;
    const cancelUrl = `${baseUrl}/preise`;

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
      client_reference_id: clerkUserId || undefined,
      metadata: commonMetadata,
      subscription_data: {
        metadata: commonMetadata,
      },
      customer_email: appEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    res.setHeader("Location", session.url as string);
    return res.status(303).end();
  } catch (err: any) {
    console.error("create-checkout-session error:", err?.message, err);
    return res.status(500).json({ error: err?.message || "Failed to create session" });
  }
}