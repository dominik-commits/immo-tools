// Verifiziert Stripe-Webhook (raw body!), reagiert auf Events (z.B. Checkout abgeschlossen)
// In Vercel Functions lesen wir den Raw-Body manuell.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";

export const config = {
  api: {
    bodyParser: false, // wichtig: wir brauchen den raw body für die Signaturprüfung
  },
};

function readRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Uint8Array[] = [];
      req.on("data", (chunk) => chunks.push(chunk));
      req.on("end", () => resolve(Buffer.concat(chunks)));
      req.on("error", reject);
    } catch (e) {
      reject(e);
    }
  });
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2023-10-16",
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).send("Method not allowed");

  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret) return res.status(500).send("Webhook secret missing");

  let event: Stripe.Event;

  try {
    const rawBody = await readRawBody(req);
    const sig = req.headers["stripe-signature"] as string;
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        // TODO: Hier würdest du in deiner DB den User „aktivieren“
        // session.customer, session.subscription, session.metadata.plan etc.
        console.log("✅ Checkout completed", {
          customer: session.customer,
          subscription: session.subscription,
          plan: session.metadata?.plan,
        });
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        console.log("✅ Invoice paid", invoice.id);
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        console.log(`ℹ️ Subscription event: ${event.type}`, {
          id: sub.id,
          status: sub.status,
          customer: sub.customer,
        });
        // TODO: Sync Abo-Status in deiner DB
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error", err);
    return res.status(500).json({ error: err.message ?? "Webhook error" });
  }
}
