// api/create-checkout-session.js
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch { reject(new Error("Ungültiger JSON-Body")); }
    });
    req.on("error", reject);
  });
}

function setCors(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  setCors(res, req.headers.origin);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY fehlt in ENV.");
    const PRICE_BASIC = process.env.PRICE_BASIC_YEARLY;
    const PRICE_PRO = process.env.PRICE_PRO_YEARLY;
    if (!PRICE_BASIC || !PRICE_PRO) throw new Error("PRICE_BASIC_YEARLY oder PRICE_PRO_YEARLY fehlt in ENV.");

    // 1) Body lesen
    const body = await readJson(req).catch(() => ({}));

    // 2) Query als Fallback
    const url = new URL(req.url, `https://${req.headers.host}`);
    const qPlan = url.searchParams.get("plan");

    const plan = String((body.plan || qPlan || "")).toLowerCase();
    if (!["basic", "pro"].includes(plan)) {
      return res.status(400).json({ error: "Ungültiger Plan. Erlaubt: basic | pro" });
    }

    // success/cancel: Body bevorzugen, sonst aus Origin ableiten
    const origin = req.headers.origin || (body.successUrl ? new URL(body.successUrl).origin : "");
    const successUrl = body.successUrl || (origin ? `${origin}/?checkout=success` : "");
    const cancelUrl  = body.cancelUrl  || (origin ? `${origin}/pricing?checkout=cancel` : "");

    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: "successUrl und cancelUrl sind erforderlich/ableitbar." });
    }

    const priceId = plan === "basic" ? PRICE_BASIC : PRICE_PRO;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      billing_address_collection: "auto",
      allow_promotion_codes: true,
      automatic_tax: { enabled: true },
      metadata: { plan }
    });

    if (!session?.url) throw new Error("Stripe hat keine Session-URL zurückgegeben.");
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[checkout] error:", err);
    return res.status(500).json({ error: err?.message || "Interner Fehler beim Checkout." });
  }
};
