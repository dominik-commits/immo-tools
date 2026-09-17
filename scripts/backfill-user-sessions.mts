// scripts/backfill-user-sessions.mts
// Einmaliges Backfill für user_sessions (siehe sql/2026-09-17_user_sessions.sql):
// setzt first_login_at = Clerk createdAt und seedet session_count = 2 für ALLE
// bereits existierenden Nutzer.
//
// session_count = 2 statt 1 ist bewusst: second_session soll beim nächsten
// echten Login NICHT für Bestandsnutzer feuern (die schon längst aktiv sind) --
// sonst entsteht ein künstlicher Aktivierungs-Peak am Einführungstag, der die
// eigentliche Aussage des Funnels für neue Signups verwässert. Das exakte
// historische Zweitbesuch-Datum für Altbestand wird dafür nicht rekonstruiert
// (wird fürs Aktivierungs-Reporting auch nicht gebraucht).
//
// Voraussetzung: sql/2026-09-17_user_sessions.sql wurde bereits im Supabase
// SQL-Editor ausgeführt (Tabelle + RPC-Funktion existieren).
//
// Ausführen mit: npx tsx scripts/backfill-user-sessions.mts
// Danach: .env.*.local mit den hier genutzten Secrets wie üblich löschen.

import { createClient } from "@supabase/supabase-js";
import { clerkClient } from "@clerk/clerk-sdk-node";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string,
  { auth: { persistSession: false } }
);

const BACKFILL_SESSION_COUNT = 2;

async function main() {
  let offset = 0;
  const limit = 100;
  let totalUpserted = 0;

  while (true) {
    const users = await clerkClient.users.getUserList({ limit, offset });
    if (!users || users.length === 0) break;

    const rows = users.map((u) => ({
      user_id: u.id,
      first_login_at: new Date(u.createdAt).toISOString(),
      last_session_date: null,
      session_count: BACKFILL_SESSION_COUNT,
    }));

    // ignoreDuplicates: true -- fasst absichtlich KEINE Zeile an, die schon existiert
    // (z.B. weil ein Nutzer sich zwischen Migration und Backfill-Lauf bereits real
    // eingeloggt hat). Das Backfill ist nur für Nutzer ohne eigene Zeile gedacht.
    const { error } = await supabase
      .from("user_sessions")
      .upsert(rows, { onConflict: "user_id", ignoreDuplicates: true });

    if (error) {
      console.error(`Fehler beim Upsert (offset ${offset}):`, error);
      process.exit(1);
    }

    totalUpserted += rows.length;
    console.log(`Backfilled ${totalUpserted} Nutzer (zuletzt: offset ${offset})...`);

    if (users.length < limit) break;
    offset += limit;
  }

  console.log(`\nFertig. ${totalUpserted} Nutzer insgesamt gebackfillt.`);
}

main().catch((e) => {
  console.error("Backfill-Skript-Fehler:", e);
  process.exit(1);
});
