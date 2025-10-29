// api/stripe/portal.js  (ESM-kompatibel)
import Stripe from "stripe";

// ⚠️ relativer Import zu deinem bereits vorhandenen Admin-Client:
import { supabaseAdmin } from "../../src/lib/supabaseAdmin.js";

export const config = { api: { bodyParser: true } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { email, return_url } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });

    // 1) Stripe-Kunden-ID aus Supabase holen
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("stripe_customer_id")
      .eq("email", email.toLowerCase().trim())
      .single();

    if (error) throw error;
    if (!data?.stripe_customer_id) {
      return res.status(404).json({ error: "No stripe_customer_id stored for user" });
    }

    // 2) Billing-Portal-Session erstellen
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripe_customer_id,
      return_url: return_url || process.env.FRONTEND_URL || "https://tools.propora.de/konto",
    });

    return res.status(200).json({ url: session.url });
  } catch (e) {
    console.error("portal error:", e);
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
