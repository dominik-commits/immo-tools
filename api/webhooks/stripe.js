// api/webhooks/stripe.js
// ESM-kompatibel

import Stripe from "stripe";
import { buffer } from "micro";

// ⬇️ relativer Import zur Server-Admin-Funktion (achte auf .js Endung!)
import { updateUserPlan } from "../src/lib/supabaseAdmin.js";

export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-30.clover",
});

const WEB_URL = process.env.FRONTEND_URL || "https://tools.propora.de";

// kleine Hilfsfunktion, um die Email sicher zu bekommen
async function getEmailFromSession(session) {
  let email =
    session?.customer_details?.email ||
    session?.customer_email ||
    null;

  // Fallback: über Customer-ID nachladen
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
      case "checkout.session.completed": {
        const session = event.data.object;

        const email = await getEmailFromSession(session);
        console.log("🔔 checkout.session.completed – email:", email);

        if (email) {
          await updateUserPlan(email, "pro"); // schreibt/legt an: email + plan
          console.log(`✅ PRO freigeschaltet: ${email}`);
        } else {
          console.warn("⚠️ Keine Email im Event – kein DB-Update möglich");
        }
        break;
      }

      // optional: hier könntest du Abo-Status-Änderungen ebenfalls mappen
      // case "customer.subscription.updated":
      // case "customer.subscription.created":
      // case "customer.subscription.deleted":
      //   ...

      default:
        console.log(`ℹ️ Unhandled event: ${event.type}`);
    }

    // 3) Stripe quittieren
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Webhook Handler Error:", err);
    return res.status(500).send("Internal Server Error");
  }
}
