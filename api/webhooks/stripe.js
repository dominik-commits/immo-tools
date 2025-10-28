// api/webhooks/stripe.js
// ESM-kompatibel

import Stripe from "stripe";
import { buffer } from "micro";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const WEB_URL = process.env.FRONTEND_URL || "https://tools.propora.de";

/* -------------------------------------------
   Helpers
------------------------------------------- */

// E-Mail aus Checkout-Session / Customer laden
async function getEmailFromSession(session) {
  let email =
    session?.customer_details?.email ||
    session?.customer_email ||
    null;

  if (!email && session?.customer) {
    try {
      const customer = await stripe.customers.retrieve(session.customer);
      email = customer?.email || null;
    } catch (e) {
      console.warn("⚠️ Konnte Stripe-Customer nicht laden:", e.message);
    }
  }
  return email;
}

async function getCustomerEmail(customerId) {
  if (!customerId) return null;
  try {
    const c = await stripe.customers.retrieve(customerId);
    return c?.email || null;
  } catch (e) {
    console.warn("⚠️ getCustomerEmail failed:", e.message);
    return null;
  }
}

/* -------------------------------------------
   Handler
------------------------------------------- */
export default async function handler(req, res) {
  // ➜ Browser-GETs freundlich auf die App umleiten
  if (req.method !== "POST") {
    res.writeHead(307, { Location: WEB_URL });
    return res.end();
  }

  // 1) Signatur prüfen
  let event;
  try {
    const sig = req.headers["stripe-signature"];
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook Error (signature/parse):", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2) Events behandeln
  try {
    // robust: dynamisch importieren (verhindert ESM/Path-Issues)
    const { updateUserPlan, upsertFromSubscription, planFromPrice } =
      await import("../../src/lib/supabaseAdmin.js");

    switch (event.type) {
      /* -------------------- CHECKOUT -------------------- */
      case "checkout.session.completed": {
        const session = event.data.object;

        // 1) Email bestimmen
        const email = await getEmailFromSession(session);

        // 2) priceId aus der Session holen (mit expand nachladen, falls nötig)
        let priceId = session?.line_items?.data?.[0]?.price?.id || null;
        if (!priceId) {
          try {
            const full = await stripe.checkout.sessions.retrieve(session.id, {
              expand: ["line_items.data.price"],
            });
            priceId = full?.line_items?.data?.[0]?.price?.id || null;
          } catch (e) {
            console.warn("⚠️ Konnte Checkout-Session expand nicht laden:", e.message);
          }
        }

        // 3) Plan aus priceId ableiten (bei dir: PRO-IDs → 'pro', sonst 'basis')
        const plan = planFromPrice(priceId);
        console.log("🔔 checkout.session.completed", { email, priceId, plan });

        if (email) {
          await updateUserPlan(email, plan); // legt an/aktualisiert: email + plan
          console.log(`✅ Plan gesetzt: ${email} → ${plan}`);
        } else {
          console.warn("⚠️ Keine Email im Event – kein DB-Update möglich");
        }
        break;
      }

      /* ------------------ SUBSCRIPTION ------------------ */
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        // Preiswechsel / Kündigung am Periodenende / Statuswechsel
        const sub = event.data.object;
        const email =
          sub?.customer_email || (await getCustomerEmail(sub?.customer));
        const status = sub?.status || null;

        // Ersten Price aus den Items ziehen (Tarifwechsel erkennen)
        const priceId = sub?.items?.data?.[0]?.price?.id || null;

        // Wichtig: KEIN auto-Downgrade bei cancel_at_period_end.
        // Plan wird ausschließlich aus priceId bestimmt (Downgrade = echter Tarifwechsel).

        console.log("🔄 subscription.updated", {
          email,
          status,
          priceId,
          cancel_at_period_end: sub?.cancel_at_period_end,
        });

        if (email) {
          await upsertFromSubscription({
            email,
            stripeCustomerId: sub?.customer || null,
            stripeSubscriptionId: sub?.id || null,
            stripePriceId: priceId, // → mappt zu 'pro' oder 'basis'
            status,                 // → subscription_status
          });
          console.log("✅ upsertFromSubscription ok");
        } else {
          console.warn("⚠️ Keine Email in subscription.updated");
        }
        break;
      }

      case "customer.subscription.deleted": {
        // Sofortiger Downgrade auf BASIS (Abo beendet)
        const sub = event.data.object;
        const email =
          sub?.customer_email || (await getCustomerEmail(sub?.customer));

        console.log("⛔ subscription.deleted – email:", email);

        if (email) {
          await upsertFromSubscription({
            email,
            stripeCustomerId: sub?.customer || null,
            stripeSubscriptionId: null,
            stripePriceId: null,        // → planFromPrice(null) = 'basis'
            status: "canceled",
          });
          console.log(`✅ downgraded to basis: ${email}`);
        } else {
          console.warn("⚠️ Keine Email in subscription.deleted");
        }
        break;
      }

      /* -------------------------------------------------- */
      default:
        console.log(`ℹ️ Unhandled event: ${event.type}`);
    }

    // 3) Stripe quittieren
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Webhook Handler Error:", err?.stack || err);
    return res.status(500).send("Internal Server Error");
  }
}
