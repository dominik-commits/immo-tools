// Einmal richtig typisieren: gibt exakt den Typ des Promise zurück.
// Hinweis: Das bricht den Promise nur logisch ab (Race). Der ursprüngliche
// Vorgang wird nicht "abgebrochen" – Supabase-Calls lassen sich eh nicht canceln.
export async function withTimeout<T>(p: Promise<T>, ms = 12000, label = "Timeout"): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(label)), ms);
    });
    // Liefert denselben Typ T wie das Original-Promise
    return await Promise.race([p, timeout]) as T;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
