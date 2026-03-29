// /api/stripe/webhook.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

// Stripe-Client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

// Supabase Service-Client (WICHTIG: SERVICE-ROLE-KEY, nicht anon-key)
const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  {
    auth: { persistSession: false },
  }
);

// Body-Parser deaktivieren (wichtig für Stripe-Signatur)
export const config = {
  api: {
    bodyParser: false,
  },
};

// Roh-Body als Buffer einlesen
async function readBuffer(req: VercelRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) {
    return res.status(400).send("Missing stripe-signature header");
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("❌ STRIPE_WEBHOOK_SECRET not set");
    return res.status(500).send("Webhook secret not configured");
  }

  let event: Stripe.Event;

  try {
    const buf = await readBuffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error("❌ Webhook signature verification failed:", err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  try {
    switch (event.type) {
      // ---------------------------------------
      // 1) Nach erfolgreichem Checkout → Plan setzen
      // ---------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const clerkUserId =
          (session.client_reference_id as string | null) ||
          (session.metadata?.clerkUserId as string | null) ||
          null;

        if (!clerkUserId) {
          console.warn("⚠️ checkout.session.completed ohne clerkUserId");
          break;
        }

        const planMeta = (session.metadata?.plan as "basis" | "pro") ?? "pro";
        const intervalMeta =
          (session.metadata?.interval as "yearly" | "monthly") ?? "yearly";

        const subscriptionId = (session.subscription as string) || null;
        const customerId = (session.customer as string) || null;

        // current_period_end aus Subscription nachziehen (optional, aber nice)
        let currentPeriodEnd: string | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          currentPeriodEnd = new Date(
            sub.current_period_end * 1000
          ).toISOString();
        }

        console.log("✅ Checkout completed, set plan:", {
          clerkUserId,
          planMeta,
          intervalMeta,
          subscriptionId,
          customerId,
        });

        const { error } = await supabase
          .from("user_plans")
          .upsert(
            {
              user_id: clerkUserId,
              plan: planMeta,
              interval: intervalMeta,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              current_period_end: currentPeriodEnd,
            },
            { onConflict: "user_id" }
          );

        if (error) {
          console.error("❌ Supabase upsert error (checkout.session.completed):", error);
          throw error;
        }

        break;
      }

      // ---------------------------------------
      // 2) Abo-Änderungen (optional, für später)
      // ---------------------------------------
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Plan abgeleitet aus Status (vereinfachte Logik)
        let newPlan: "basis" | "pro" | null = null;

        if (
          subscription.status === "active" ||
          subscription.status === "trialing"
        ) {
          // Optional: aus Price-ID ableiten, hier nur Platzhalter:
          // z.B. wenn du PRICE_BASIC_YEARLY etc. in ENV hast
          const priceId = subscription.items.data[0]?.price?.id;

          if (
            priceId &&
            (priceId === process.env.PRICE_BASIC_YEARLY ||
              priceId === process.env.PRICE_BASIC_MONTHLY)
          ) {
            newPlan = "basis";
          } else if (
            priceId &&
            (priceId === process.env.PRICE_PRO_YEARLY ||
              priceId === process.env.PRICE_PRO_MONTHLY)
          ) {
            newPlan = "pro";
          }
        } else {
          // cancelled / unpaid / incomplete → Plan auf null
          newPlan = null;
        }

        const { data: rows, error: fetchErr } = await supabase
          .from("user_plans")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .limit(1)
          .maybeSingle();

        if (fetchErr) {
          console.error("❌ Supabase select error (subscription.updated):", fetchErr);
          throw fetchErr;
        }

        if (!rows) {
          console.warn(
            "⚠️ subscription.updated/deleted, aber kein user_plans-Eintrag gefunden für customer",
            customerId
          );
          break;
        }

        const { error: updateErr } = await supabase
          .from("user_plans")
          .update({
            plan: newPlan,
            stripe_subscription_id: subscription.id,
            current_period_end: new Date(
              subscription.current_period_end * 1000
            ).toISOString(),
          })
          .eq("user_id", rows.user_id);

        if (updateErr) {
          console.error("❌ Supabase update error (subscription.updated):", updateErr);
          throw updateErr;
        }

        break;
      }

      default:
        // Andere Events ignorieren wir
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("❌ Fehler im Stripe-Webhook-Handler:", err?.message || err);
    return res.status(500).send("Webhook handler error");
  }
}
