// src/lib/supabaseAdmin.js (ESM)

import { createClient } from "@supabase/supabase-js";

// Service-Client (Server-Side) – NICHT den anon key verwenden!
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false }
  }
);

/**
 * Legt den User an oder aktualisiert ihn (plan, email unique).
 */
export async function updateUserPlan(email, plan) {
  if (!email) throw new Error("updateUserPlan: email missing");

  const { error } = await supabaseAdmin
    .from("users")
    .upsert(
      { email: email.toLowerCase().trim(), plan },
      { onConflict: "email" } // nutzt UNIQUE(email)
    );

  if (error) throw error;
  return true;
}
