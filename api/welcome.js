// api/welcome.mjs
import Stripe from "stripe";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

// --- helpers -------------------------------------------------
const SESSION_COOKIE = "imoa";            // Cookie-Name
const DASHBOARD_URL  = process.env.APP_DASHBOARD_URL || "/app";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 Tage

function sign(payload, secret) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig  = crypto.createHmac("sha256", secret).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyPaid(session) {
  // Payment Links mit Abo: entweder paid oder complete
  if (session.payment_status === "paid") return true;
  if (session.status === "complete") return true;
  return false;
}

function sendRedirect(res, location, status = 302) {
  res.statusCode = status;
  res.setHeader("Location", location);
  res.end();
}

// --- handler -------------------------------------------------
export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      res.setHeader("Allow", "GET");
      return res.status(405).json({ error: "Method not allowed" });
    }

    const url = new URL(req.url, `https://${req.headers.host}`);
    const sessionId = url.searchParams.get("session_id");
    const planFromQS = url.searchParams.get("plan"); // optional ?plan=basic|pro

    if (!sessionId) return sendRedirect(res, "/login?e=missing_session", 302);

    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("Missing STRIPE_SECRET_KEY");
      return sendRedirect(res, "/login?e=server_config", 302);
    }
    if (!process.env.SESSION_SECRET) {
      console.error("Missing SESSION_SECRET");
      return sendRedirect(res, "/login?e=server_config", 302);
    }

    // Checkout-Session holen (inkl. line_items/price für Plan-Erkennung)
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["customer", "subscription", "line_items.data.price", "line_items.data.price.product"],
    });

    if (!verifyPaid(session)) {
      return sendRedirect(res, "/pricing?checkout=pending", 302);
    }

    // Email ermitteln
    const email =
      session?.customer_details?.email ||
      session?.customer?.email ||
      session?.customer_email ||
      null;

    if (!email) {
      console.warn("No email on session:", sessionId);
      return sendRedirect(res, "/login?e=no_email", 302);
    }

    // Plan bestimmen
    let plan =
      session?.metadata?.plan ||
      planFromQS ||
      session?.line_items?.data?.[0]?.price?.nickname ||
      session?.line_items?.data?.[0]?.price?.lookup_key ||
      "basic";

    // Minimal: hier würdest du dein Userkonto anlegen/aktivieren.
    // createOrActivateUser(email, plan)  ← an dein System anbinden.

    // Token bauen (sehr einfacher, HMAC-signierter Token)
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      sub: email,
      plan,
      si: session.id,
      iat: now,
      exp: now + COOKIE_MAX_AGE,
    };
    const token = sign(payload, process.env.SESSION_SECRET);

    // HttpOnly-Cookie setzen
    const cookie = [
      `${SESSION_COOKIE}=${token}`,
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${COOKIE_MAX_AGE}`,
      `Secure`,
    ].join("; ");

    res.setHeader("Set-Cookie", cookie);

    // Ab ins Dashboard
    return sendRedirect(res, DASHBOARD_URL, 302);
  } catch (err) {
    console.error("[welcome] error", err);
    return sendRedirect(res, "/login?e=welcome_error", 302);
  }
}

