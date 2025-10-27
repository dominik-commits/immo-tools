// api/webhooks/stripe.js
// Serverless-Route für Stripe-Webhooks auf Vercel.
// Voraussetzungen (package.json):
//   "dependencies": { "stripe": "^14", "micro": "^9" }
//
// ENV Variablen (Vercel Settings → Environment Variables):
//   STRIPE_SECRET_KEY         = sk_live_...
//   STRIPE_WEBHOOK_SECRET     = whsec_...   (zum *Live*-Endpoint passend)
//   FRONTEND_URL              = https://tools.propora.de   (optional)

const Stripe = require("stripe");
const { buffer } = require("micro");

exports.config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-30.clover",
});

const WEB_URL = process.env.FRONTEND_URL || "https://tools.propora.de";

/**
 * TODO: Ersetze diese Funktion mit deiner DB-Logik (Supabase/Prisma/Firebase o.ä.)
 * updateUserPlan(email, plan) soll den Benutzer-Plan in deiner DB setzen.
 */
async function updateUserPlan(email, plan) {
  console.log(`ℹ️ [updateUserPlan] ${email} -> ${plan}`);
  // Beispiel Prisma:
  // await prisma.user.update({ where: { email }, data: { plan }});
  // Beispiel Supabase:
  // await supabase.from('users').update({ plan }).eq('email', email);
}

module.exports = async (req, res) => {
  // ➜ Alle Nicht-POST-Requests (z. B. GET im Browser) auf die App weiterleiten
  if (req.method !== "POST") {
    res.writeHead(307, { Location: WEB_URL });
    return res.end();
  }

  let event;
  try {
    const sig = req.headers["stripe-signature"];
    const buf = await buffer(req);

    // Signatur prüfen (verhindert Spoofing / Body-Manipulation)
    event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("❌ Webhook Error (signature/parse):", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        // E-Mail je nach Checkout-Typ
        const email =
          session?.customer_details?.email ||
          session?.customer_email ||
          null;

        if (email) {
          await updateUserPlan(email, "pro");
          console.log(`✅ PRO freigeschaltet via checkout.session.completed: ${email}`);
        } else {
          console.warn("⚠️ checkout.session.completed ohne Email");
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        // Stripe liefert hier nicht immer customer_email; ggf. über Customer nachladen,
        // falls du das brauchst (nur wenn du im Handler weitere Stripe-Calls machen willst).
        const status = sub.status; // 'active', 'trialing', 'past_due', 'canceled', ...
        const email = sub.customer_email || null;

        if (email) {
          if (status === "active" || status === "trialing") {
            await updateUserPlan(email, "pro");
            console.log(`✅ PRO aktiv (subscription ${status}): ${email}`);
          } else if (status === "canceled" || status === "unpaid") {
            await updateUserPlan(email, "basis");
            console.log(`↩️ Downgrade auf BASIS (subscription ${status}): ${email}`);
          }
        } else {
          console.log(`ℹ️ subscription.${event.type.endsWith("updated") ? "updated" : "created"} ohne email (ok).`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const email = sub.customer_email || null;
        if (email) {
          await updateUserPlan(email, "basis");
          console.log(`↩️ Downgrade auf BASIS (subscription.deleted): ${email}`);
        } else {
          console.log("ℹ️ subscription.deleted ohne email (ok).");
        }
        break;
      }

      case "invoice.payment_succeeded": {
        // Optional: Quittungen, Abrechnungslogik, etc.
        console.log("ℹ️ invoice.payment_succeeded verarbeitet.");
        break;
      }

      default: {
        // Andere Events ignorieren wir vorerst nur mit Log
        console.log(`ℹ️ Unhandled event: ${event.type}`);
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Webhook Handler Error:", err);
    return res.status(500).send("Internal Server Error");
  }
};
