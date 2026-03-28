// api/import-expose-mfh.ts
// Vercel Serverless Function — POST /api/import-expose-mfh
//
// Receives a German real estate exposé PDF, extracts structured data
// using Claude Vision (claude-sonnet-4-20250514), and returns a
// Propora-compatible input object.
//
// Deploy: place this file at /api/import-expose-mfh.ts in your project root.
// Vercel will automatically expose it as a serverless function.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Fields Propora's applyImportedInput() understands */
interface ProporaInput {
  kaufpreis?: number;            // Purchase price (€)
  gesamtFlaecheM2?: number;      // Total living area (m²)
  kaltmieteJahr?: number;        // Annual cold rent (€/year)
  kaltmieteMonat?: number;       // Monthly cold rent (€/month) — derived if absent
  bundesland?: string;           // German federal state
  anzahlEinheiten?: number;      // Number of residential units
  baujahr?: number;              // Year of construction
  leerstandPct?: number;         // Vacancy rate (0–1), default 0.04 if unknown
  kaufnebenkosten?: number;      // Ancillary purchase costs (€), optional
  grundstueckFlaeche?: number;   // Plot area (m²), optional
  adresse?: string;              // Street address, optional
}

interface ExtractionResult {
  input: ProporaInput;
  confidence: Record<keyof ProporaInput, "high" | "medium" | "low" | "missing">;
  missingFields: (keyof ProporaInput)[];
  rawNotes?: string;             // AI free-text notes / caveats
}

interface ApiResponse {
  success: boolean;
  data?: ExtractionResult;
  error?: string;
  detail?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUIRED_FIELDS: (keyof ProporaInput)[] = [
  "kaufpreis",
  "gesamtFlaecheM2",
  "kaltmieteJahr",
];

const BUNDESLAENDER = [
  "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen",
  "Hamburg", "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen",
  "Nordrhein-Westfalen", "Rheinland-Pfalz", "Saarland", "Sachsen",
  "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen",
];

// ---------------------------------------------------------------------------
// Claude extraction prompt
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `Du bist ein Experte für deutsche Immobilien-Exposés.
Deine Aufgabe ist es, strukturierte Daten aus einem Immobilien-Exposé zu extrahieren.
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt — kein Markdown, keine Erklärungen, kein Präfix.`;

function buildUserPrompt(): string {
  return `Analysiere das beigefügte Immobilien-Exposé und extrahiere die folgenden Felder.

Gib das Ergebnis als JSON-Objekt mit dieser exakten Struktur zurück:

{
  "input": {
    "kaufpreis": <number | null>,           // Kaufpreis in Euro (z.B. 750000)
    "gesamtFlaecheM2": <number | null>,     // Gesamte Wohnfläche in m² (z.B. 520)
    "kaltmieteJahr": <number | null>,       // Jahreskaltmiete in Euro (z.B. 48000)
    "kaltmieteMonat": <number | null>,      // Monatliche Kaltmiete in Euro (z.B. 4000)
    "bundesland": <string | null>,          // Bundesland (z.B. "Bayern")
    "anzahlEinheiten": <number | null>,     // Anzahl der Wohneinheiten
    "baujahr": <number | null>,             // Baujahr (z.B. 1978)
    "leerstandPct": <number | null>,        // Leerstandsquote als Dezimalzahl (z.B. 0.05)
    "kaufnebenkosten": <number | null>,     // Kaufnebenkosten in Euro
    "grundstueckFlaeche": <number | null>,  // Grundstücksfläche in m²
    "adresse": <string | null>              // Vollständige Adresse
  },
  "confidence": {
    // Für jedes Feld: "high" | "medium" | "low" | "missing"
    // "high"    = direkt und eindeutig im Text genannt
    // "medium"  = berechnet oder indirekt erschlossen
    // "low"     = unsichere Schätzung
    // "missing" = nicht gefunden
    "kaufpreis": "...",
    "gesamtFlaecheM2": "...",
    "kaltmieteJahr": "...",
    "kaltmieteMonat": "...",
    "bundesland": "...",
    "anzahlEinheiten": "...",
    "baujahr": "...",
    "leerstandPct": "...",
    "kaufnebenkosten": "...",
    "grundstueckFlaeche": "...",
    "adresse": "..."
  },
  "rawNotes": "<optionale Hinweise zu Besonderheiten oder Unsicherheiten>"
}

Wichtige Hinweise:
- Kaufpreis: Suche nach "Kaufpreis", "Angebotspreis", "Verkaufspreis" — OHNE Kaufnebenkosten
- Wohnfläche: Suche nach "Wohnfläche", "Nutzfläche", "Gesamtfläche" in m²
- Kaltmiete: Suche nach "Kaltmiete", "Mieteinnahmen", "Jahresnettomiete", "IST-Miete"
  - Falls nur Monatsmiete angegeben: multipliziere mit 12 für kaltmieteJahr
  - Falls nur Jahresmiete angegeben: dividiere durch 12 für kaltmieteMonat
- Bundesland: Leite es aus der Adresse oder Ortsangabe ab. Gültige Werte: ${BUNDESLAENDER.join(", ")}
- Leerstand: Falls nicht explizit genannt, setze null (Frontend-Default: 4%)
- Verwende null für unbekannte Felder — NIEMALS erfundene Werte
- Alle Geldbeträge als reine Zahlen ohne Punkte/Kommas (z.B. 750000, nicht 750.000)`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse multipart/form-data manually — avoids external deps on Vercel edge.
 * Returns { pdfBase64, filename } or throws.
 */
async function extractPdfFromRequest(
  req: VercelRequest
): Promise<{ pdfBase64: string; filename: string }> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("error", reject);
    req.on("end", () => {
      const body = Buffer.concat(chunks);
      const contentType = req.headers["content-type"] ?? "";

      // Extract boundary
      const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
      if (!boundaryMatch) {
        return reject(new Error("No multipart boundary found"));
      }
      const boundary = boundaryMatch[1];

      // Split into parts
      const delimiter = Buffer.from(`--${boundary}`);
      const parts: Buffer[] = [];
      let start = 0;

      while (start < body.length) {
        const idx = body.indexOf(delimiter, start);
        if (idx === -1) break;
        const end = body.indexOf(delimiter, idx + delimiter.length);
        if (end === -1) {
          parts.push(body.slice(idx + delimiter.length));
          break;
        }
        parts.push(body.slice(idx + delimiter.length, end));
        start = end;
      }

      // Find the PDF part
      for (const part of parts) {
        const str = part.toString("latin1");
        if (
          str.includes('name="file"') ||
          str.includes("application/pdf") ||
          str.includes(".pdf")
        ) {
          // Headers end at \r\n\r\n
          const headerEnd = part.indexOf(Buffer.from("\r\n\r\n"));
          if (headerEnd === -1) continue;

          const headerStr = part.slice(0, headerEnd).toString();
          const filenameMatch = headerStr.match(/filename="([^"]+)"/);
          const filename = filenameMatch?.[1] ?? "expose.pdf";

          // Content is after \r\n\r\n, strip trailing \r\n
          const content = part.slice(headerEnd + 4);
          const trimmed =
            content[content.length - 2] === 0x0d &&
            content[content.length - 1] === 0x0a
              ? content.slice(0, -2)
              : content;

          return resolve({
            pdfBase64: trimmed.toString("base64"),
            filename,
          });
        }
      }

      reject(new Error("No PDF file found in request"));
    });
  });
}

/**
 * Derive missing fields where possible, clean up nulls, post-process.
 */
function postProcess(raw: ProporaInput): ProporaInput {
  const result = { ...raw };

  // Derive yearly ↔ monthly rent
  if (result.kaltmieteJahr && !result.kaltmieteMonat) {
    result.kaltmieteMonat = Math.round(result.kaltmieteJahr / 12);
  } else if (result.kaltmieteMonat && !result.kaltmieteJahr) {
    result.kaltmieteJahr = result.kaltmieteMonat * 12;
  }

  // Remove null values so applyImportedInput() only gets defined fields
  return Object.fromEntries(
    Object.entries(result).filter(([, v]) => v !== null && v !== undefined)
  ) as ProporaInput;
}

/**
 * Identify which required fields are missing or have low confidence.
 */
function getMissingFields(
  input: ProporaInput,
  confidence: Record<string, string>
): (keyof ProporaInput)[] {
  return REQUIRED_FIELDS.filter(
    (field) =>
      input[field] === undefined ||
      input[field] === null ||
      confidence[field] === "missing"
  );
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // ── CORS headers ──────────────────────────────────────────────────────────
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ success: false, error: "Method not allowed" } satisfies ApiResponse);
    return;
  }

  // ── Validate content type ─────────────────────────────────────────────────
  const contentType = req.headers["content-type"] ?? "";
  if (!contentType.includes("multipart/form-data")) {
    res.status(400).json({
      success: false,
      error: "Expected multipart/form-data",
    } satisfies ApiResponse);
    return;
  }

  // ── Extract PDF ───────────────────────────────────────────────────────────
  let pdfBase64: string;
  let filename: string;

  try {
    ({ pdfBase64, filename } = await extractPdfFromRequest(req));
  } catch (err) {
    console.error("[import-expose-mfh] PDF extraction failed:", err);
    res.status(400).json({
      success: false,
      error: "Could not extract PDF from request",
      detail: err instanceof Error ? err.message : String(err),
    } satisfies ApiResponse);
    return;
  }

  // ── Validate PDF size (max 20 MB) ─────────────────────────────────────────
  const sizeBytes = (pdfBase64.length * 3) / 4;
  if (sizeBytes > 20 * 1024 * 1024) {
    res.status(413).json({
      success: false,
      error: "PDF too large (max 20 MB)",
    } satisfies ApiResponse);
    return;
  }

  // ── Call Claude API ───────────────────────────────────────────────────────
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  let rawJson: string;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: pdfBase64,
              },
            },
            {
              type: "text",
              text: buildUserPrompt(),
            },
          ],
        },
      ],
    });

    // Concatenate all text blocks
    rawJson = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    console.error("[import-expose-mfh] Claude API error:", err);
    res.status(502).json({
      success: false,
      error: "AI extraction failed",
      detail: err instanceof Error ? err.message : String(err),
    } satisfies ApiResponse);
    return;
  }

  // ── Parse Claude response ─────────────────────────────────────────────────
  let parsed: {
    input: ProporaInput;
    confidence: Record<keyof ProporaInput, "high" | "medium" | "low" | "missing">;
    rawNotes?: string;
  };

  try {
    // Strip accidental markdown fences
    const clean = rawJson.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    parsed = JSON.parse(clean);
  } catch (err) {
    console.error("[import-expose-mfh] JSON parse error. Raw response:\n", rawJson);
    res.status(502).json({
      success: false,
      error: "Could not parse AI response as JSON",
      detail: rawJson.slice(0, 500),
    } satisfies ApiResponse);
    return;
  }

  // ── Post-process & build response ─────────────────────────────────────────
  const processedInput = postProcess(parsed.input ?? {});
  const missingFields = getMissingFields(processedInput, parsed.confidence ?? {});

  const result: ExtractionResult = {
    input: processedInput,
    confidence: parsed.confidence ?? {},
    missingFields,
    rawNotes: parsed.rawNotes,
  };

  console.info(
    `[import-expose-mfh] Processed "${filename}" — missing: [${missingFields.join(", ")}]`
  );

  res.status(200).json({ success: true, data: result } satisfies ApiResponse);
}

// ---------------------------------------------------------------------------
// Vercel config — disable body parsing so we handle multipart manually
// ---------------------------------------------------------------------------
export const config = {
  api: {
    bodyParser: false,
    // Allow up to 25 MB uploads
    sizeLimit: "25mb",
  },
};