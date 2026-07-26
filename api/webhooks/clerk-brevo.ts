// api/webhooks/clerk-brevo.ts
// Clerk webhook -> Brevo: neuen User in Liste 5 eintragen
// Clerk webhook -> Meta Conversions API: CompleteRegistration Event senden
//
// ENV vars needed in .env.production.local:
//   BREVO_API_KEY=xkeysib-...
//   CLERK_WEBHOOK_SECRET=whsec_... (aus Clerk Dashboard)
//   META_CAPI_ACCESS_TOKEN=... (aus Meta Events Manager -> Pixel -> Einstellungen -> Conversions API)
//   META_PIXEL_ID=26841181368888849
//   META_TEST_EVENT_CODE=TEST12345 (nur temporaer waehrend des Testens, danach entfernen/leer lassen)
import { Webhook } from 'svix';
import { WebhookEvent } from '@clerk/nextjs/server';

export const config = { runtime: 'edge' };

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

// Edge Runtime unterstuetzt kein Node "crypto" Modul, deshalb Web Crypto API
// (crypto.subtle ist in der Edge Runtime global verfuegbar)
async function hashData(value: string): Promise<string> {
  const normalized = value.trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sendMetaSignupEvent(
  email: string,
  userId: string,
  req: Request
): Promise<void> {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  const pixelId = process.env.META_PIXEL_ID;

  if (!accessToken || !pixelId) {
    console.error('Meta CAPI: Missing META_CAPI_ACCESS_TOKEN oder META_PIXEL_ID, skipping event');
    return;
  }

  const eventId = `signup_${userId}`;

  // Client IP und User-Agent mitschicken -> verbessert Match-Qualitaet bei Meta
  const clientIp =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    undefined;
  const userAgent = req.headers.get('user-agent') || undefined;

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: 'CompleteRegistration',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        event_source_url: 'https://tools.propora.de',
        user_data: {
          em: [await hashData(email)],
          ...(clientIp ? { client_ip_address: clientIp } : {}),
          ...(userAgent ? { client_user_agent: userAgent } : {}),
        },
      },
    ],
  };

  // Waehrend des Testens: META_TEST_EVENT_CODE setzen, um Events im
  // Events Manager -> Testevents-Tab zu sehen, bevor sie live einfliessen.
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${accessToken}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const error = await res.text();
      console.error('Meta CAPI error:', error);
    } else {
      console.log(`Meta CAPI: CompleteRegistration Event fuer ${email} gesendet`);
    }
  } catch (err) {
    // Fehler bei Meta darf den restlichen Webhook-Flow (Brevo) nicht abbrechen
    console.error('Meta CAPI fetch error:', err);
  }
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

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

  const brevoApiKey = process.env.BREVO_API_KEY;
  if (!brevoApiKey) {
    return new Response('Missing BREVO_API_KEY', { status: 500 });
  }

  // Meta CAPI Event feuern - unabhaengig vom Brevo-Ergebnis, damit ein
  // Fehler bei Meta niemals die Brevo-Eintragung verhindert.
  await sendMetaSignupEvent(primaryEmail, id, req);

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
        listIds: [5],
        updateEnabled: true,
      }),
    });

    if (!brevoRes.ok) {
      const error = await brevoRes.text();
      console.error('Brevo API error:', error);
      return new Response('Brevo error', { status: 500 });
    }

    console.log(`User ${primaryEmail} in Brevo Liste 5 eingetragen`);
    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Brevo fetch error:', err);
    return new Response('Internal error', { status: 500 });
  }
}
