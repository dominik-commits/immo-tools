// /api/stripe-webhook.ts
import Stripe from 'stripe';

// Achtung: service Schlüssel, NICHT der client key
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY!;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;

// Price-ID → Plan
const PRICE_TO_PLAN: Record<string, 'basic' | 'pro'> = {
  // TODO: HIER DEINE PRICE IDs EINTRAGEN:
  // 'price_123_basic_yearly': 'basic',
  // 'price_456_pro_yearly': 'pro',
};

type Plan = 'basic' | 'pro';

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

export const config = {
  runtime: 'nodejs20.x', // Node runtime (für Stripe-Signatur)
};

async function upsertUser(args: {
  email?: string | null;
  customerId?: string | null;
  subscriptionId?: string | null;
  plan?: Plan | null;
  status?: string | null;
}) {
  const { email, customerId, subscriptionId, plan, status } = args;

  // kleiner helper: bevorzugt customerId, sonst email
  let where = '';
  if (customerId) {
    where = `stripe_customer_id=eq.${encodeURIComponent(customerId)}`;
  } else if (email) {
    where = `email=eq.${encodeURIComponent(email)}`;
  } else {
    return;
  }

  const resGet = await fetch(`${SUPABASE_URL}/rest/v1/users?${where}`, {
    headers: {
      apikey: SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
      Prefer: 'return=minimal',
    },
  });

  if (resGet.status === 200) {
    const found = await resGet.json();
    const exists = Array.isArray(found) && found.length > 0;

    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (email) payload.email = email;
    if (customerId) payload.stripe_customer_id = customerId;
    if (subscriptionId) payload.stripe_subscription_id = subscriptionId;
    if (plan) payload.plan = plan;
    if (status) payload.subscription_status = status;

    if (exists) {
      // Update
      const id = found[0].id;
      await fetch(`${SUPABASE_URL}/rest/v1/users?id=eq.${id}`, {
        method: 'PATCH',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(payload),
      });
    } else {
      // Insert
      if (!email) return; // für Insert brauchen wir mind. email
      await fetch(`${SUPABASE_URL}/rest/v1/users`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          email,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan,
          subscription_status: status,
        }),
      });
    }
  }
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  // Stripe braucht RAW Body (als Text)
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('Missing signature', { status: 400 });

  let event: Stripe.Event;

  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return new Response(`Webhook signature verification failed. ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const s = event.data.object as Stripe.Checkout.Session;
        const email = (s.customer_details?.email || s.customer_email) ?? null;
        const customerId = typeof s.customer === 'string' ? s.customer : s.customer?.id ?? null;

        let plan: Plan | null = null;
        // Versuche aus session line_items den Price zu lesen
        if (s.mode === 'subscription' && s.subscription) {
          const sub =
            typeof s.subscription === 'string'
              ? await stripe.subscriptions.retrieve(s.subscription)
              : s.subscription;
          const priceId = sub.items.data[0]?.price?.id;
          if (priceId && PRICE_TO_PLAN[priceId]) {
            plan = PRICE_TO_PLAN[priceId];
          }
          await upsertUser({
            email,
            customerId,
            subscriptionId: typeof s.subscription === 'string' ? s.subscription : s.subscription.id,
            plan,
            status: sub.status,
          });
        } else {
          await upsertUser({ email, customerId });
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
        const priceId = sub.items.data[0]?.price?.id;
        const plan: Plan | null = priceId && PRICE_TO_PLAN[priceId] ? PRICE_TO_PLAN[priceId] : null;
        await upsertUser({
          customerId,
          subscriptionId: sub.id,
          plan,
          status: sub.status,
        });
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer?.id ?? null;
        await upsertUser({
          customerId,
          subscriptionId: sub.id,
          plan: null, // kein Plan mehr
          status: 'canceled',
        });
        break;
      }

      default:
        // andere Events → ok
        break;
    }

    return new Response('ok', { status: 200 });
  } catch (e: any) {
    return new Response(`Webhook handler error: ${e.message}`, { status: 500 });
  }
}
