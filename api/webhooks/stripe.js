// api/webhooks/stripe.js
// → kompatibel mit ESM ("type": "module")

import Stripe from "stripe";
import { buffer } from "micro";

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-03-30.clover",
});

const WEB_URL = process.env.FRONTEND_URL || "https://tools.propora.de";

export default async function handler(req, res) {
  // ➜ Alle Nicht-POST-Requests auf App weiterleiten
  if (req.method !== "POST") {
    res.writeHead(307, { Location: WEB_URL });
    return res.end();
  }

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

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const email =
          session?.customer_details?.email || session?.customer_email;
        console.log("✅ checkout.session.completed für:", email);
        break;
      }

      default:
        console.log(`ℹ️ Unhandled event: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Webhook Handler Error:", err);
    return res.status(500).send("Internal Server Error");
  }
}
