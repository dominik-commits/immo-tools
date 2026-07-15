// api/webhooks/clerk-brevo.ts
// Clerk webhook → Brevo: neuen User in Liste 5 eintragen
// 
// ENV vars needed in .env.production.local:
//   BREVO_API_KEY=xkeysib-...
//   CLERK_WEBHOOK_SECRET=whsec_... (aus Clerk Dashboard)

import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';

export const config = { api: { bodyParser: false } };

async function getRawBody(req: Request): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = req.body?.getReader();
  if (!reader) return Buffer.from('');
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // 1. Clerk Webhook Signatur verifizieren
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return new Response('Missing CLERK_WEBHOOK_SECRET', { status: 500 });
  }

  const svix_id = req.headers.get('svix-id');
  const svix_timestamp = req.headers.get('svix-timestamp');
  const svix_signature = req.headers.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const rawBody = await getRawBody(req);

  let event: WebhookEvent;
  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(rawBody, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Webhook verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  // 2. Nur user.created Events verarbeiten
  if (event.type !== 'user.created') {
    return new Response('OK', { status: 200 });
  }

  const { id, email_addresses, first_name, last_name } = event.data;

  const primaryEmail = email_addresses?.find(
    (e) => e.id === event.data.primary_email_address_id
  )?.email_address;

  if (!primaryEmail) {
    console.error('No primary email found for user:', id);
    return new Response('No email', { status: 400 });
  }

  // 3. User in Brevo Liste 5 eintragen
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    return new Response('Missing BREVO_API_KEY', { status: 500 });
  }

  try {
    const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'api-key': brevoApiKey,
      },
      body: JSON.stringify({
        email: primaryEmail,
        attributes: {
          FIRSTNAME: first_name || '',
          LASTNAME: last_name || '',
          CLERK_USER_ID: id,
        },
        listIds: [5], // PROPORA Free Users Liste
        updateEnabled: true, // falls Contact schon existiert → updaten
      }),
    });

    if (!brevoRes.ok) {
      const error = await brevoRes.text();
      console.error('Brevo API error:', error);
      return new Response('Brevo error', { status: 500 });
    }

    console.log(`✓ User ${primaryEmail} in Brevo Liste 5 eingetragen`);
    return new Response('OK', { status: 200 });

  } catch (err) {
    console.error('Brevo fetch error:', err);
    return new Response('Internal error', { status: 500 });
  }
}
