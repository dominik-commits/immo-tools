// scripts/test-webhook-logic.mts
// Ruft die echte Webhook-Verarbeitungslogik (handleCheckoutSessionCompleted,
// handleSubscriptionChange) direkt mit simulierten Stripe-Objekten auf --
// umgeht die HTTP-Signaturprüfung komplett, testet aber echte Code-Logik
// gegen die echte user_plans-Tabelle und einen echten Clerk-Account.
//
// Absichtlich unterdrückt: Meta CAPI Subscribe-Event (META_CAPI_ACCESS_TOKEN/
// META_PIXEL_ID werden vor dem Import entfernt), damit die simulierten
// Test-Events keine echten Facebook/Meta-Conversion-Daten verfälschen.
//
// Aufräumen am Ende: löscht die Test-Zeile aus user_plans und setzt Clerk
// publicMetadata des Test-Users auf den vorher erfassten Originalzustand zurück.
//
// Ausführen mit: npx tsx scripts/test-webhook-logic.mts

delete process.env.META_CAPI_ACCESS_TOKEN;
delete process.env.META_PIXEL_ID;

import { createClient } from "@supabase/supabase-js";
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionChange,
} from "../api/webhooks/stripe";

const TEST_CLERK_USER_ID = "user_3FAa3DBtkO24WyA1CDyunlLQra9"; // dominik@theleanteam.de
const TEST_CUSTOMER_ID = "cus_test_verification_delete_me";
const TEST_SUBSCRIPTION_ID = "sub_test_verification_delete_me";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

async function getClerkUser(userId: string) {
  const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
  });
  if (!res.ok) throw new Error(`Clerk get user failed: ${await res.text()}`);
  return res.json();
}

async function setClerkPublicMetadata(userId: string, metadata: Record<string, unknown>) {
  const res = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ public_metadata: metadata }),
  });
  if (!res.ok) throw new Error(`Clerk set metadata failed: ${await res.text()}`);
}

async function getUserPlanRow(userId: string) {
  const { data, error } = await supabase
    .from("user_plans")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function report(label: string) {
  const row = await getUserPlanRow(TEST_CLERK_USER_ID);
  const clerkUser = await getClerkUser(TEST_CLERK_USER_ID);
  console.log(`\n=== ${label} ===`);
  console.log("user_plans Zeile:", JSON.stringify(row, null, 2));
  console.log("Clerk publicMetadata:", JSON.stringify(clerkUser.public_metadata));
}

async function main() {
  // Originalzustand sichern, um am Ende exakt zurückzusetzen
  const original = await getClerkUser(TEST_CLERK_USER_ID);
  const originalMetadata = original.public_metadata ?? {};
  console.log("Original publicMetadata (wird am Ende wiederhergestellt):", JSON.stringify(originalMetadata));

  try {
    // --- Test 1: checkout.session.completed -----------------------------
    // subscription bewusst null, um den echten stripe.subscriptions.retrieve()-
    // Call zu vermeiden (würde eine echte, nicht existierende Live-Subscription
    // abfragen). Das betrifft nur current_period_end beim Ersteintrag, nicht
    // die hier zu testende Kernlogik (Clerk-Update + Supabase-Upsert).
    const fakeSession = {
      id: "cs_test_verification_delete_me",
      client_reference_id: TEST_CLERK_USER_ID,
      metadata: { clerkUserId: TEST_CLERK_USER_ID, plan: "pro", interval: "yearly" },
      subscription: null,
      customer: TEST_CUSTOMER_ID,
      customer_details: { email: "dominik@theleanteam.de" },
      customer_email: null,
      amount_total: 19900,
      currency: "eur",
    } as any;

    await handleCheckoutSessionCompleted(fakeSession);
    await report("Test 1: checkout.session.completed (plan=pro, interval=yearly)");

    // --- Test 2: customer.subscription.updated, status=active, MONTHLY ---
    // Bewusst mit dem Monats-Preis, nicht Jahres-Preis: testet gezielt den
    // vorher gefixten Bug (Intervall wurde hier früher hart auf "yearly"
    // gesetzt, unabhängig vom tatsächlichen Abo).
    const fakeSubscriptionActive = {
      id: TEST_SUBSCRIPTION_ID,
      customer: TEST_CUSTOMER_ID,
      status: "active",
      items: {
        data: [
          {
            price: {
              id: process.env.PRICE_PRO_MONTHLY,
              recurring: { interval: "month" },
            },
          },
        ],
      },
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
    } as any;

    await handleSubscriptionChange(fakeSubscriptionActive);
    await report("Test 2: customer.subscription.updated, status=active, PRICE_PRO_MONTHLY (erwartet: plan=pro, interval=monthly)");

    // --- Test 3: customer.subscription.deleted ---------------------------
    const fakeSubscriptionDeleted = {
      id: TEST_SUBSCRIPTION_ID,
      customer: TEST_CUSTOMER_ID,
      status: "canceled",
      items: {
        data: [
          {
            price: {
              id: process.env.PRICE_PRO_MONTHLY,
              recurring: { interval: "month" },
            },
          },
        ],
      },
      current_period_end: Math.floor(Date.now() / 1000),
    } as any;

    await handleSubscriptionChange(fakeSubscriptionDeleted);
    await report("Test 3: customer.subscription.deleted (erwartet: plan=null in Supabase, plan=free in Clerk)");
  } finally {
    // --- Aufräumen ---------------------------------------------------------
    console.log("\n=== Aufräumen ===");
    const { error: delErr } = await supabase.from("user_plans").delete().eq("user_id", TEST_CLERK_USER_ID);
    console.log("user_plans Testzeile gelöscht:", delErr ? `FEHLER: ${JSON.stringify(delErr)}` : "OK");

    await setClerkPublicMetadata(TEST_CLERK_USER_ID, originalMetadata);
    const restored = await getClerkUser(TEST_CLERK_USER_ID);
    console.log("Clerk publicMetadata zurückgesetzt auf:", JSON.stringify(restored.public_metadata));
  }
}

main().catch((e) => {
  console.error("Testskript-Fehler:", e);
  process.exit(1);
});
