// src/lib/supabaseAdmin.js (ESM)

import { createClient } from "@supabase/supabase-js";

// Service-Client (Server-Side) – NICHT den anon key verwenden!
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false }
  }
);

/**
 * Legt den User an oder aktualisiert ihn (plan, email unique).
 */
export async function updateUserPlan(email, plan) {
  if (!email) throw new Error("updateUserPlan: email missing");

  const { error } = await supabaseAdmin
    .from("users")
    .upsert(
      { email: email.toLowerCase().trim(), plan },
      { onConflict: "email" } // nutzt UNIQUE(email)
    );

  if (error) throw error;
  return true;
}

// Plan aus Stripe-Price-ID ableiten
export function planFromPrice(priceId) {
  if (!priceId) return "basis";
  const PROS = [
    process.env.PRICE_PRO_YEARLY,
    process.env.PRICE_PRO_MONTHLY,   // falls du später einen Monatsplan hast
  ].filter(Boolean);
  return PROS.includes(priceId) ? "pro" : "basis";
}

/**
 * Upsert anhand Stripe Subscription
 * - aktualisiert plan, subscription_status, stripe_customer_id, stripe_subscription_id
 */
export async function upsertFromSubscription({
  email,
  stripeCustomerId,
  stripeSubscriptionId,
  stripePriceId,
  status,
}) {
  if (!email) throw new Error("upsertFromSubscription: email missing");

  const plan = planFromPrice(stripePriceId) || "basis";

  const { error } = await supabaseAdmin
    .from("users")
    .upsert(
      {
        email: email.toLowerCase().trim(),
        plan,
        subscription_status: status || null,
        stripe_customer_id: stripeCustomerId || null,
        stripe_subscription_id: stripeSubscriptionId || null,
      },
      { onConflict: "email" }
    );

  if (error) throw error;
  return true;
}