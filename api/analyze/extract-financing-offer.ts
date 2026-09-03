// api/analyze/extract-financing-offer.ts
// Extrahiert strukturierte Finanzierungsangebot-Felder aus dem Text eines
// Bank-PDFs via Claude. Läuft serverseitig, weil der Aufruf zuvor direkt aus
// dem Browser ging und dabei den Anthropic-API-Key im öffentlichen JS-Bundle
// offengelegt hat (VITE_ANTHROPIC_API_KEY) -- jeder Website-Besucher konnte
// den Key per DevTools auslesen und auf Kosten des Projekts Anfragen stellen.
//
// Erfordert nur eine gültige Clerk-Session (kein PRO nötig) -- passend zum
// Seitenzugang von /finanzierungsvergleich, der ebenfalls nur Login verlangt.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clerkClient } from "@clerk/clerk-sdk-node";
import Anthropic from "@anthropic-ai/sdk";

const PROMPT_TEMPLATE = (text: string) => `Du bekommst den Text eines Bankangebots für eine Immobilienfinanzierung. Extrahiere die folgenden Werte, falls vorhanden, und antworte AUSSCHLIESSLICH mit einem JSON-Objekt, ohne Markdown, ohne Codeblock, ohne weiteren Text.

{
  "name": string,                      // Bankname/Anbieter, falls erkennbar, sonst "Angebot"
  "sollzinsPct": number,                // Sollzins p.a. in Prozent, z.B. 3.8
  "zinsbindungJahre": number,           // Sollzinsbindung in Jahren
  "tilgungStartPct": number,            // anfängliche Tilgung in Prozent
  "bereitstellungsfreieMonate": number, // bereitstellungsfreie Monate
  "bereitstellungszinsPct": number,     // Bereitstellungszins p.a. in Prozent
  "sondertilgungPct": number,           // kostenlose Sondertilgung p.a. in Prozent
  "bearbeitungsgebuehrPct": number,     // Bearbeitungsgebühr in Prozent der Kreditsumme
  "effektiverJahreszinsPct": number     // effektiver Jahreszins in Prozent, falls angegeben
}

Verwende 0 als Wert, wenn eine Angabe im Text nicht auffindbar ist. Text des Angebots:
"""
${text.slice(0, 12000)}
"""`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "UNAUTHENTICATED" });
  }
  try {
    await clerkClient.verifyToken(token);
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }

  const text = req.body?.text;
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "INVALID_PAYLOAD" });
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 500,
      messages: [{ role: "user", content: PROMPT_TEMPLATE(text) }],
    });

    const block = message.content[0];
    const textBlock = block && block.type === "text" ? block.text : "";
    const cleaned = textBlock.replace(/```json|```/g, "").trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return res.status(200).json({ offer: null });
    }

    return res.status(200).json({ offer: parsed });
  } catch (err) {
    console.error("extract-financing-offer error", err);
    return res.status(502).json({ error: "EXTRACTION_FAILED" });
  }
}
