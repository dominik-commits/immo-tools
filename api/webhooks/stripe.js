// api/webhooks/stripe.js
// ESM-kompatibel (Vercel Functions)

import Stripe from "stripe";
import { buffer } from "micro";
import { Clerk } from "@clerk/clerk-sdk-node";

export const config = { api: { bodyParser: false } };

// --- Stripe & Clerk Setup ---
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});
const clerk = new Clerk({ secretKey: process.env.CLERK_SECRET_KEY });

const WEB_URL = process.env.FRONTEND_URL || "https://tools.propora.de";

// Preis-IDs für PRO (kommasepariert), alternativ einzelne ENV-Variablen
const PRO_PRICE_IDS = (process.env.PRO_PRICE_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// -------------------------------------------
// Helpers
// -------------------------------------------

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

// Plan aus Price-ID ableiten
function planFromPrice(priceId) {
  if (!priceId) return "basis";
  if (PRO_PRICE_IDS.includes(priceId)) return "pro";

  // Fallback: auch einzelne ENV-Variablen abprüfen
  const proSingles = [
    process.env.PRICE_PRO_MONTHLY,
    process.env.PRICE_PRO_YEARLY,
    process.env.PRICE_PRO_LIFETIME,
  ].filter(Boolean);
  if (proSingles.includes(priceId)) return "pro";

  return "basis";
}

// Clerk: Nutzer per E-Mail finden (ersten Treffer zurückgeben)
async function findClerkUserByEmail(email) {
  if (!email) return null;
  const list = await clerk.users.getUserList({ emailAddress: [email] });
  return (list?.data && list.data[0]) || null;
}

// Clerk: publicMetadata mergen & speichern
async function updateClerkUserMetadataByEmail(email, metaPatch) {
  const user = await findClerkUserByEmail(email);
  if (!user) {
    console.warn("⚠️ Clerk-User nicht gefunden für:", email);
    return null;
  }

  const currentPublic = user.publicMetadata || {};
  const nextPublic = { ...currentPublic, ...metaPatch };

  await clerk.users.updateUser(user.id, {
    publicMetadata: nextPublic,
  });

  return user.id;
}

// -------------------------------------------
// Handler
// -------------------------------------------
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

        // 3) Plan ermitteln
        const plan = planFromPrice(priceId);
        console.log("🔔 checkout.session.completed", { email, priceId, plan });

        if (email) {
          await updateClerkUserMetadataByEmail(email, {
            plan,                        // "basis" | "pro"
            stripe_price_id: priceId || null,
            stripe_checkout_id: session?.id || null,
          });
          console.log(`✅ Clerk-Metadaten gesetzt: ${email} → plan=${plan}`);
        } else {
          console.warn("⚠️ Keine Email im Event – kein Clerk-Update möglich");
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
        const plan = planFromPrice(priceId);

        // Wichtig: KEIN auto-Downgrade bei cancel_at_period_end.
        // Plan wird ausschließlich aus priceId bestimmt (Downgrade = echter Tarifwechsel).

        console.log("🔄 subscription.updated", {
          email,
          status,
          priceId,
          plan,
          cancel_at_period_end: sub?.cancel_at_period_end,
        });

        if (email) {
          await updateClerkUserMetadataByEmail(email, {
            plan,                            // "basis" | "pro"
            subscription_status: status,     // z.B. "active", "trialing", "past_due"
            stripe_customer_id: sub?.customer || null,
            stripe_subscription_id: sub?.id || null,
            stripe_price_id: priceId || null,
          });
          console.log("✅ Clerk-Metadaten aktualisiert (subscription.updated)");
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
          await updateClerkUserMetadataByEmail(email, {
            plan: "basis",
            subscription_status: "canceled",
            stripe_customer_id: sub?.customer || null,
            stripe_subscription_id: null,
            stripe_price_id: null,
          });
          console.log(`✅ downgraded to basis (Clerk): ${email}`);
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
