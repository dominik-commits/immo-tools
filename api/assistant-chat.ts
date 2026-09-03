// api/assistant-chat.ts
// Proxy für den PROPORA-Assistenten (Chat-Widget, global auf jeder Seite
// eingeblendet, auch für nicht eingeloggte Besucher). Läuft serverseitig, weil
// src/components/Assistent/index.tsx den Anthropic-API-Key zuvor direkt aus dem
// Browser gesendet hat (VITE_ANTHROPIC_API_KEY) -- jeder Besucher konnte den Key
// per DevTools/Netzwerk-Tab auslesen und auf Kosten des Projekts Anfragen stellen.
//
// Bewusst ohne Auth-Pflicht, da das Widget auch anonymen Besuchern zur Verfügung
// steht (identisch zum bisherigen Verhalten) -- der Fix betrifft ausschließlich
// die Geheimhaltung des API-Keys, nicht den Zugriffsumfang des Widgets.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Du bist der integrierte Assistent von PROPORA – einer Cashflow-Analyse-Software für Immobilien-Investoren in Deutschland.

ÜBER PROPORA:
Propora analysiert Immobilien als Kapitalanlage. Nutzer geben wenige Daten ein (Kaufpreis, Mieteinnahmen, Finanzierungsdaten) und sehen sofort, ob sich ein Investment lohnt.

ZIELGRUPPEN:
- Immobilien-Einsteiger (erster Kauf, erste Analyse)
- Investoren (schnelles Screening vieler Objekte)
- Makler (Aufbereitung für Kunden)

PROPORA TOOLS:
1. CASHFLOW-ANALYSE – Kaufpreis, Miete, Nebenkosten, Kredit → Cashflow, Rendite, Break-Even
2. EXPOSÉ-IMPORT – PDF oder URL (ImmoScout, Immonet, eBay) → automatische Datenerkennung
3. OBJEKTVERGLEICH – mehrere Objekte parallel vergleichen, Ranking nach Rendite
4. FINANZIERUNGSRECHNER – Rate, Zinsen, Tilgung, Laufzeit
5. AfA-RECHNER – steuerliche Abschreibung (Wohnen 2%, Neubau ab 2023: 3%, Gewerbe 3%)
6. MIETKALKULATIONSRECHNER – Mietspiegel, Leerstandsrisiko

KENNZAHLEN:
- Bruttorendite = (Jahreskaltmiete / Kaufpreis) × 100 → mind. 4–5% anstreben
- Kaufpreisfaktor = Kaufpreis / Jahreskaltmiete → unter 25 ist gut
- Nettorendite = Jahresreinertrag / Gesamtinvestition × 100
- Cashflow = Miete - Kreditrate - Rücklagen - Nebenkosten

Antworte auf Deutsch, klar und kompakt (3–6 Sätze). Nutze **Fettschrift** für wichtige Begriffe.`;

type ChatMessage = { role: "user" | "assistant"; content: string };

function isValidHistory(body: any): body is { messages: ChatMessage[] } {
  return (
    body &&
    Array.isArray(body.messages) &&
    body.messages.length > 0 &&
    body.messages.length <= 50 &&
    body.messages.every(
      (m: any) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length <= 4000
    )
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  if (!isValidHistory(req.body)) {
    return res.status(400).json({ error: "INVALID_PAYLOAD" });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: req.body.messages,
    });

    const block = message.content[0];
    const reply = block && block.type === "text" ? block.text : "Keine Antwort erhalten.";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("assistant-chat error", err);
    return res.status(502).json({ error: "CHAT_FAILED" });
  }
}
