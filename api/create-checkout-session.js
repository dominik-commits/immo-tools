// api/create-checkout-session.js
const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { priceId } = req.body || {};
    if (!priceId) {
      res.status(400).json({ error: 'Missing priceId' });
      return;
    }

    const origin = req.headers.origin || process.env.FRONTEND_URL || 'https://propora.de';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/app?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      automatic_tax: { enabled: true },
    });

    res.status(200).json({ id: session.id, url: session.url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Stripe session failed' });
  }
};
