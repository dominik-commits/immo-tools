// /api/create-portal-session.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: '2024-06-20',
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { customerId } = req.body as { customerId: string };

    if (!customerId) return res.status(400).json({ error: 'Missing customerId' });

    const returnUrl =
      process.env.STRIPE_PORTAL_RETURN_URL ||
      `${getBaseUrl()}/app`;

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return res.status(200).json({ url: portal.url });
  } catch (err: any) {
    console.error('create-portal-session error', err);
    return res.status(500).json({ error: err.message });
  }
}

function getBaseUrl() {
  return process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:5173';
}

