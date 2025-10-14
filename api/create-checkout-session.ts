// api/create-checkout-session.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { plan } = req.body as { plan: 'basic' | 'pro' };

    if (!plan) {
      return res.status(400).json({ error: 'Missing plan' });
    }

    const priceMap: Record<'basic' | 'pro', string> = {
      basic: process.env.PRICE_BASIC_YEARLY as string,
      pro: process.env.PRICE_PRO_YEARLY as string,
    };

    const priceId = priceMap[plan];
    if (!priceId) {
      return res.status(400).json({ error: 'Invalid plan or price not configured' });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://propora.de';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${frontendUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/pricing?canceled=1`,
      automatic_tax: { enabled: true },
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('[checkout] error', err);
    return res.status(500).json({ error: err.message ?? 'Server error' });
  }
}
