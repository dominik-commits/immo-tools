// /api/stripe/webhook.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2024-06-20",
});

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

export const config = { api: { bodyParser: false } };

async function readBuffer(req: VercelRequest): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function setClerkPlan(clerkUserId: string, plan: string, interval: string) {
  const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}/metadata`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      public_metadata: { plan, interval },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("Clerk metadata update failed:", err);
    throw new Error(`Clerk update failed: ${err}`);
  }
  console.log("Clerk publicMetadata updated:", { clerkUserId, plan, interval });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"] as string | undefined;
  if (!sig) return res.status(400).send("Missing stripe-signature header");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) return res.status(500).send("Webhook secret not configured");

  let event: Stripe.Event;
  try {
    const buf = await readBuffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err?.message);
    return res.status(400).send(`Webhook Error: ${err?.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        const clerkUserId =
          (session.client_reference_id as string | null) ||
          (session.metadata?.clerkUserId as string | null) ||
          null;

        const planMeta = (session.metadata?.plan as "basis" | "pro") ?? "pro";
        const intervalMeta = (session.metadata?.interval as "yearly" | "monthly") ?? "yearly";
        const subscriptionId = (session.subscription as string) || null;
        const customerId = (session.customer as string) || null;

        let currentPeriodEnd: string | null = null;
        if (subscriptionId) {
          const sub = await stripe.subscriptions.retrieve(subscriptionId);
          currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
        }

        if (clerkUserId) {
          // Plan in Clerk publicMetadata setzen
          await setClerkPlan(clerkUserId, planMeta, intervalMeta);

          // Plan in Supabase speichern
          const { error } = await supabase.from("user_plans").upsert(
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
            console.error("Supabase upsert error:", error);
            throw error;
          }
          console.log("Plan gesetzt:", { clerkUserId, planMeta, intervalMeta });
        } else {
          // Kein clerkUserId - in pending_plans speichern
          const customerEmail = session.customer_details?.email || session.customer_email || null;
          if (customerEmail) {
            await supabase.from("pending_plans").upsert({
              email: customerEmail,
              plan: planMeta,
              interval: intervalMeta,
              stripe_session_id: session.id,
            }, { onConflict: "email" });
            console.log("pending_plan gespeichert fuer", customerEmail);
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        let newPlan: "basis" | "pro" | null = null;
        if (subscription.status === "active" || subscription.status === "trialing") {
          const priceId = subscription.items.data[0]?.price?.id;
          if (priceId && (priceId === process.env.PRICE_BASIC_YEARLY || priceId === process.env.PRICE_BASIC_MONTHLY)) {
            newPlan = "basis";
          } else if (priceId && (priceId === process.env.PRICE_PRO_YEARLY || priceId === process.env.PRICE_PRO_MONTHLY)) {
            newPlan = "pro";
          }
        }

        const { data: rows, error: fetchErr } = await supabase
          .from("user_plans")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .limit(1)
          .maybeSingle();

        if (fetchErr) throw fetchErr;

        if (rows?.user_id) {
          // Clerk updaten
          if (newPlan) {
            await setClerkPlan(rows.user_id, newPlan, "yearly");
          } else {
            await setClerkPlan(rows.user_id, "free", "");
          }

          // Supabase updaten
          const { error: updateErr } = await supabase
            .from("user_plans")
            .update({
              plan: newPlan,
              stripe_subscription_id: subscription.id,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq("user_id", rows.user_id);

          if (updateErr) throw updateErr;
        }
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err?.message || err);
    return res.status(500).send("Webhook handler error");
  }
}
