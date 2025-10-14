// api/create-checkout-session.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Nur POST zulassen
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { plan } = req.body as { plan: 'basic' | 'pro' };

    if (!plan) {
      return res.status(400).json({ error: 'Missing plan' });
    }

    // Price-IDs aus ENV, serverseitig
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
      automatic_tax: { enabled: true },          // nutzt deine Stripe Tax-Einstellung
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('[checkout] error', err);
    return res.status(500).json({ error: err.message ?? 'Server error' });
  }
}
