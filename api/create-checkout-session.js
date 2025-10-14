// api/create-checkout-session.js
// Vercel Serverless (Node) – erzeugt eine Stripe-Checkout-Session für Abos

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Hilfsfunktion: JSON-Body sicher lesen (reines Node-HTTP, kein Next.js)
function readJson(req) {
  return new Promise((resolve, reject) => {
    try {
      let raw = "";
      req.on("data", (chunk) => (raw += chunk));
      req.on("end", () => {
        if (!raw) return resolve({});
        try {
          resolve(JSON.parse(raw));
        } catch (e) {
          reject(new Error("Ungültiger JSON-Body"));
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

// Einfache CORS-Header (optional enger machen)
function setCors(res, origin) {
  res.setHeader("Access-Control-Allow-Origin", origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async (req, res) => {
  setCors(res, req.headers.origin);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY fehlt in den Umgebungsvariablen.");
    }

    // Price-IDs aus ENV (Live/Test je nach Vercel-Environment setzen)
    const PRICE_BASIC = process.env.PRICE_BASIC_YEARLY;
    const PRICE_PRO = process.env.PRICE_PRO_YEARLY;
    if (!PRICE_BASIC || !PRICE_PRO) {
      throw new Error("PRICE_BASIC_YEARLY oder PRICE_PRO_YEARLY fehlt in ENV.");
    }

    const body = await readJson(req);
    const plan = String(body?.plan || "").toLowerCase();
    const successUrl = String(body?.successUrl || "");
    const cancelUrl = String(body?.cancelUrl || "");

    if (!["basic", "pro"].includes(plan)) {
      return res.status(400).json({ error: "Ungültiger Plan. Erlaubt: basic | pro" });
    }
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: "successUrl und cancelUrl sind erforderlich." });
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
      // Optional: metadata/Client-Ref
      metadata: { plan },
    });

    if (!session?.url) {
      throw new Error("Stripe hat keine Session-URL zurückgegeben.");
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error("[checkout] error:", err);
    return res.status(500).json({
      error: err?.message || "Interner Fehler beim Checkout.",
    });
  }
};
