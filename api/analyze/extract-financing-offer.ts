// api/analyze/extract-financing-offer.ts
// Extrahiert strukturierte Finanzierungsangebot-Felder aus dem Text eines
// Bank-PDFs via Claude. Läuft serverseitig, weil der Aufruf zuvor direkt aus
// dem Browser ging und dabei den Anthropic-API-Key im öffentlichen JS-Bundle
// offengelegt hat (VITE_ANTHROPIC_API_KEY) -- jeder Website-Besucher konnte
// den Key per DevTools auslesen und auf Kosten des Projekts Anfragen stellen.
//
// Login genügt für das 1. Angebot -- ab dem 2. Angebot (existingOfferCount >= 1)
// ist der Import ein PRO-Feature (siehe FinanzierungsVergleich.tsx, maxOffers).
// Der Client meldet, wie viele Angebote bereits existieren; das schließt die
// Lücke, dass bislang jeder eingeloggte User (auch Free) beliebig viele
// Angebote importieren konnte, weil nur die UI das Limit durchgesetzt hat.
// Hinweis: ohne serverseitige Zähl-Persistenz pro User bleibt dies auf den
// vom Client gemeldeten Stand angewiesen -- schließt also den naheliegenden
// Bypass (State-Manipulation in der UI), nicht aber einen komplett
// gescripteten Direktaufruf mit dauerhaft gefälschtem existingOfferCount:0.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clerkClient } from "@clerk/clerk-sdk-node";
import Anthropic from "@anthropic-ai/sdk";

function isPro(plan: unknown): boolean {
  return plan === "pro" || plan === "basis";
}

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
  let userId: string;
  try {
    const payload = await clerkClient.verifyToken(token);
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: "INVALID_TOKEN" });
  }

  const text = req.body?.text;
  const existingOfferCount = Number(req.body?.existingOfferCount) || 0;
  if (typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "INVALID_PAYLOAD" });
  }

  if (existingOfferCount >= 1) {
    let plan: unknown;
    try {
      const user = await clerkClient.users.getUser(userId);
      plan = (user.publicMetadata as Record<string, unknown> | null)?.plan;
    } catch {
      return res.status(401).json({ error: "USER_LOOKUP_FAILED" });
    }
    if (!isPro(plan)) {
      return res.status(403).json({ error: "PRO_REQUIRED" });
    }
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
