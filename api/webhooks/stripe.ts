// /api/stripe/webhook.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

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

function hashData(value: string): string {
  return crypto
    .createHash("sha256")
    .update(value.trim().toLowerCase())
    .digest("hex");
}

async function sendMetaSubscribeEvent(params: {
  email: string | null;
  clerkUserId: string | null;
  sessionId: string;
  valueCents: number | null;
  currency: string | null;
}): Promise<void> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID;

  if (!accessToken || !pixelId) {
    console.error("Meta CAPI: Missing META_CAPI_ACCESS_TOKEN oder META_PIXEL_ID, skipping Subscribe event");
    return;
  }

  if (!params.email) {
    console.error("Meta CAPI: Keine Email fuer Subscribe Event vorhanden, skipping");
    return;
  }

  const eventId = `subscribe_${params.sessionId}`;

  const userData: Record<string, unknown> = {
    em: [hashData(params.email)],
  };
  if (params.clerkUserId) {
    userData.external_id = [hashData(params.clerkUserId)];
  }

  const customData: Record<string, unknown> = {};
  if (params.valueCents !== null) {
    customData.value = params.valueCents / 100;
    customData.currency = (params.currency || "eur").toUpperCase();
  }

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: "Subscribe",
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: "website",
        event_source_url: "https://tools.propora.de",
        user_data: userData,
        custom_data: customData,
      },
    ],
  };

  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error("Meta CAPI Subscribe error:", error);
    } else {
      console.log(`Meta CAPI: Subscribe Event fuer ${params.email} gesendet (${customData.value ?? "kein value"} ${customData.currency ?? ""})`);
    }
  } catch (err) {
    // Fehler bei Meta darf den restlichen Webhook-Flow nicht abbrechen
    console.error("Meta CAPI Subscribe fetch error:", err);
  }
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

// Event-Logik als eigene, exportierte Funktionen statt inline im switch --
// so lässt sich die echte Verarbeitungslogik in einem Testskript direkt
// importieren und mit simulierten Payloads aufrufen, ohne über HTTP/Stripe-
// Signaturprüfung zu gehen (siehe scripts/test-webhook-logic.mts).

export async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const clerkUserId =
    (session.client_reference_id as string | null) ||
    (session.metadata?.clerkUserId as string | null) ||
    null;

  const planMeta = "pro" as const;
  const intervalMeta = (session.metadata?.interval as "yearly" | "monthly") ?? "yearly";
  const subscriptionId = (session.subscription as string) || null;
  const customerId = (session.customer as string) || null;
  const customerEmail = session.customer_details?.email || session.customer_email || null;

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

    // Meta CAPI: Subscribe Event senden - unabhaengig vom Rest, blockiert nichts
    await sendMetaSubscribeEvent({
      email: customerEmail,
      clerkUserId,
      sessionId: session.id,
      valueCents: session.amount_total ?? null,
      currency: session.currency ?? null,
    });
  } else {
    // Kein clerkUserId - in pending_plans speichern
    if (customerEmail) {
      await supabase.from("pending_plans").upsert({
        email: customerEmail,
        plan: planMeta,
        interval: intervalMeta,
        stripe_session_id: session.id,
      }, { onConflict: "email" });
      console.log("pending_plan gespeichert fuer", customerEmail);

      // Meta CAPI: Subscribe Event trotzdem senden, auch ohne Clerk-Zuordnung
      await sendMetaSubscribeEvent({
        email: customerEmail,
        clerkUserId: null,
        sessionId: session.id,
        valueCents: session.amount_total ?? null,
        currency: session.currency ?? null,
      });
    }
  }
}

export async function handleSubscriptionChange(subscription: Stripe.Subscription): Promise<void> {
  // Deckt "renewed", "cancelled" und "payment_failed" ab: Stripe feuert
  // customer.subscription.updated bei jeder Erneuerung (current_period_end
  // rückt vor) genauso wie bei einem fehlgeschlagenen Zahlungsversuch
  // (status wechselt auf "past_due"/"unpaid", greift dann sofort im
  // else-Zweig unten -- kein separater invoice.payment_failed-Handler nötig,
  // solange nur der Plan-Zugriff aktualisiert werden muss).
  const customerId = subscription.customer as string;
  const price = subscription.items.data[0]?.price;

  let newPlan: "pro" | null = null;
  if (subscription.status === "active" || subscription.status === "trialing") {
    if (price?.id === process.env.PRICE_PRO_YEARLY || price?.id === process.env.PRICE_PRO_MONTHLY) {
      newPlan = "pro";
    }
  }
  // Intervall aus dem echten Stripe-Preis ableiten statt hartzukodieren --
  // vorher wurde hier immer "yearly" gesetzt, auch für monatliche Abos.
  const newInterval: "yearly" | "monthly" = price?.recurring?.interval === "month" ? "monthly" : "yearly";

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
      await setClerkPlan(rows.user_id, newPlan, newInterval);
    } else {
      await setClerkPlan(rows.user_id, "free", "");
    }

    // Supabase updaten
    const { error: updateErr } = await supabase
      .from("user_plans")
      .update({
        plan: newPlan,
        interval: newPlan ? newInterval : null,
        stripe_subscription_id: subscription.id,
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq("user_id", rows.user_id);

    if (updateErr) throw updateErr;
  }
}

export async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // Kein eigenes Kunden-Benachrichtigungs-Handling (das ist eine spätere
  // Produktentscheidung) -- nur ein strukturiertes Log, damit ein
  // fehlgeschlagener Zahlungsversuch nachvollziehbar ist, statt nur
  // indirekt am verschwindenden PRO-Zugriff bemerkt zu werden (der
  // Zugriffsentzug selbst läuft weiterhin über customer.subscription.updated,
  // sobald der Status auf "past_due"/"unpaid" wechselt).
  console.error("Zahlung fehlgeschlagen:", {
    customerId: invoice.customer as string,
    // Feld existiert zur Laufzeit (unsere API-Version liefert es), aber
    // die installierten Stripe-Typen sind neuer als unsere gepinnte
    // apiVersion und kennen es nicht mehr direkt auf Invoice -- dasselbe
    // Muster wie beim current_period_end-Mismatch weiter oben in dieser Datei.
    subscriptionId: ((invoice as any).subscription as string) || null,
    amountDue: invoice.amount_due,
    currency: invoice.currency,
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt
      ? new Date(invoice.next_payment_attempt * 1000).toISOString()
      : null,
    reason: invoice.last_finalization_error?.message || null,
  });
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
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        await handleSubscriptionChange(event.data.object as Stripe.Subscription);
        break;

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      // Bewusst kein eigenes Handling -- checkout.session.completed deckt den
      // Erstkauf inkl. clerkUserId bereits ab, customer.subscription.updated
      // feuert bei jeder Verlängerung ohnehin (current_period_end verschiebt
      // sich), unabhängig von invoice.payment_succeeded.
      case "customer.subscription.created":
      case "invoice.payment_succeeded":
        break;

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err?.message || err);
    return res.status(500).send("Webhook handler error");
  }
}
