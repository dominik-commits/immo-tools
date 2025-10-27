// api/webhooks/stripe.js
import { buffer } from "micro";
import Stripe from "stripe";

export const config = {
  api: { bodyParser: false },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const sig = req.headers["stripe-signature"];
  const buf = await buffer(req);

  try {
    const event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    console.log("✅ Webhook empfangen:", event.type);

    // Beispielaktion
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("Checkout abgeschlossen für:", session.customer_email);
      // TODO: Benutzer in DB auf "pro" setzen
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error("❌ Webhook Error:", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
