export async function updateUserPlan(email, plan) {
  if (!email) throw new Error("updateUserPlan: email missing");

  const { error } = await supabaseAdmin
    .from("users")
    .upsert(
      { email: email.toLowerCase().trim(), plan },
      { onConflict: "email" } // nutzt deinen UNIQUE(email)
    );

  if (error) throw error;
  return true;
}
