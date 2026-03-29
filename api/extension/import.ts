// api/extension/import.ts
// Exposé-Import (MVP)
// - erkennt Portal
// - versucht bei ImmoScout24 zu scrapen
// - falls Scraper nichts findet: Mock-Fallback mit sinnvollen Gewerbe-Daten

import type { VercelRequest, VercelResponse } from "@vercel/node";

type PortalId = "immoscout" | "immowelt" | "immonet" | "ebay" | "other";

function detectPortal(urlStr: string): { portal: PortalId; label: string } {
  const u = urlStr.toLowerCase();

  if (u.includes("immobilienscout24")) {
    return { portal: "immoscout", label: "ImmoScout24" };
  }
  if (u.includes("immowelt")) {
    return { portal: "immowelt", label: "Immowelt" };
  }
  if (u.includes("immonet")) {
    return { portal: "immonet", label: "Immonet" };
  }
  if (u.includes("ebay-kleinanzeigen") || u.includes("kleinanzeigen.de")) {
    return { portal: "ebay", label: "eBay Kleinanzeigen" };
  }

  return { portal: "other", label: "Immo-Portal" };
}

/* -------------------------------------------------------------------------- */
/*  Einfacher ImmoScout-Scraper                                               */
/* -------------------------------------------------------------------------- */

type RawScrapeResult = {
  kaufpreis: number | null;
  totalAreaM2: number | null;
  nettokaltmieteMonat: number | null;
  zonen: {
    name: string;
    areaM2: number;
    rentPerM2: number;
  }[];
};

function scrapeImmoScoutFromHtml(html: string, rawUrl: string): RawScrapeResult {
  // Kaufpreis (z.B. aus eingebettetem JSON: "obj_purchasePrice":"2700000")
  const priceMatch = html.match(/"obj_purchasePrice":"(\d+)"/);
  const kaufpreis = priceMatch ? Number(priceMatch[1]) : null;

  // Gesamtfläche (z.B. "obj_mainFloorSpace":"540")
  const areaMatch = html.match(/"obj_mainFloorSpace":"(\d+)"/);
  const totalAreaM2 = areaMatch ? Number(areaMatch[1]) : null;

  // Nettokaltmiete, z.B. „Die Nettokaltmiete … beträgt derzeit 8568 Euro.“
  const rentMatch = html.match(/Nettokaltmiete[^0-9]*([\d\.]+)\s*Euro/i);
  const nettokaltmieteMonat = rentMatch
    ? Number(rentMatch[1].replace(/\./g, ""))
    : null;

  let zonen: { name: string; areaM2: number; rentPerM2: number }[] = [];

  if (totalAreaM2 && nettokaltmieteMonat) {
    const avgRentPerM2 = nettokaltmieteMonat / totalAreaM2;

    // alle m²-Angaben einsammeln
    const areaCandidates: number[] = [];
    const areaRegex = /(\d{2,4})\s*m²/g;
    let m: RegExpExecArray | null;
    while ((m = areaRegex.exec(html)) !== null) {
      const v = Number(m[1]);
      if (Number.isFinite(v)) areaCandidates.push(v);
    }

    let fl1: number | null = null;
    let fl2: number | null = null;

    // Pärchen suchen, dessen Summe der Gesamtfläche entspricht
    if (areaCandidates.length >= 2) {
      outer: for (let i = 0; i < areaCandidates.length; i++) {
        for (let j = i + 1; j < areaCandidates.length; j++) {
          const a = areaCandidates[i];
          const b = areaCandidates[j];
          if (a + b === totalAreaM2) {
            fl1 = a;
            fl2 = b;
            break outer;
          }
        }
      }
    }

    if (fl1 && fl2) {
      zonen = [
        {
          name: "Gewerbeeinheit 1",
          areaM2: fl1,
          rentPerM2: Number(avgRentPerM2.toFixed(2)),
        },
        {
          name: "Gewerbeeinheit 2",
          areaM2: fl2,
          rentPerM2: Number(avgRentPerM2.toFixed(2)),
        },
      ];
    } else {
      // Fallback: eine Zone mit Gesamtfläche
      zonen = [
        {
          name: "Gewerbe gesamt",
          areaM2: totalAreaM2,
          rentPerM2: Number((nettokaltmieteMonat / totalAreaM2).toFixed(2)),
        },
      ];
    }
  }

  return { kaufpreis, totalAreaM2, nettokaltmieteMonat, zonen };
}

/* -------------------------------------------------------------------------- */
/*  Mock-Fallback (wenn Scraper nichts findet)                               */
/* -------------------------------------------------------------------------- */

function buildMockData(rawUrl: string, portal: PortalId) {
  const base = {
    kaufpreis: null as number | null,
    nebenkosten: null as
      | {
          grunderwerb: number;
          notar: number;
          grundbuch: number;
          makler: number;
          sonstiges: number;
        }
      | null,
    zonen: [] as any[],
    type: "unknown" as const,
  };

  if (portal === "immoscout") {
    // Mock orientiert sich an deinem Beispiel-Exposé (2,7 Mio., 540 m²)
    return {
      ...base,
      type: "gewerbe" as const,
      kaufpreis: 2_700_000,
      nebenkosten: {
        grunderwerb: 0.065,
        notar: 0.015,
        grundbuch: 0.005,
        makler: 0.035,
        sonstiges: 0,
      },
      zonen: [
        {
          name: "Gewerbeeinheit EG",
          areaM2: 380,
          rentPerM2: 15.9,
          vacancyPct: 0.08,
          recoverablePct: 0.82,
          freeRentMonthsY1: 1,
          tiPerM2: 40,
          leaseTermYears: 4,
        },
        {
          name: "Gewerbeeinheit OG",
          areaM2: 160,
          rentPerM2: 13.5,
          vacancyPct: 0.1,
          recoverablePct: 0.75,
          freeRentMonthsY1: 0,
          tiPerM2: 30,
          leaseTermYears: 5,
        },
      ],
    };
  }

  return base;
}

/* -------------------------------------------------------------------------- */
/*  Handler                                                                   */
/* -------------------------------------------------------------------------- */

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    const body: any = req.body || {};
    const rawUrl = typeof body.url === "string" ? body.url.trim() : "";

    if (!rawUrl) {
      res.status(400).json({
        ok: false,
        error: "INVALID_PAYLOAD",
        message: "Feld 'url' fehlt oder ist leer.",
      });
      return;
    }

    try {
      // eslint-disable-next-line no-new
      new URL(rawUrl);
    } catch {
      res.status(400).json({
        ok: false,
        error: "INVALID_URL",
        message: "Die übergebene URL ist nicht gültig.",
      });
      return;
    }

    const { portal, label } = detectPortal(rawUrl);

    let kaufpreis: number | null = null;
    let zonen: any[] = [];
    let nebenkosten: any = null;
    let type: "unknown" | "gewerbe" = "unknown";
    let source: "scraper" | "mock" | "none" = "none";

    // 1) Scraper-Versuch für ImmoScout
    if (portal === "immoscout") {
      try {
        const resp = await fetch(rawUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
            "Accept-Language": "de-DE,de;q=0.9,en;q=0.8",
          },
        });

        const status = resp.status;
        const html = await resp.text();

        console.log("[Immo-Import] Fetch status", status, "len", html.length);

        if (status >= 200 && status < 300 && html.length > 0) {
          const scraped = scrapeImmoScoutFromHtml(html, rawUrl);
          console.log("[Immo-Import] scraped", scraped);

          if (scraped.kaufpreis || scraped.zonen.length > 0) {
            kaufpreis = scraped.kaufpreis;
            zonen = scraped.zonen.map((z) => ({
              name: z.name,
              areaM2: z.areaM2,
              rentPerM2: z.rentPerM2,
              vacancyPct: 0.0,
              recoverablePct: 0.8,
              freeRentMonthsY1: 0,
              tiPerM2: 0,
              leaseTermYears: 5,
            }));

            nebenkosten = null;
            type = "gewerbe";
            source = "scraper";
          }
        }
      } catch (e) {
        console.error("[Immo-Import] Fehler beim Scrapen", e);
      }
    }

    // 2) Falls Scraper nichts gefunden hat: Mock-Fallback
    if (source === "none") {
      const mock = buildMockData(rawUrl, portal);
      if (mock.kaufpreis !== null || (mock.zonen && mock.zonen.length > 0)) {
        kaufpreis = mock.kaufpreis;
        zonen = mock.zonen;
        nebenkosten = mock.nebenkosten;
        type = mock.type;
        source = "mock";
      }
    }

    const hasData = kaufpreis !== null || (zonen && zonen.length > 0);

    const responsePayload = {
      ok: true,
      message: hasData
        ? source === "scraper"
          ? "Exposé-Daten wurden aus dem Immo-Portal übernommen (Scraper-MVP)."
          : "Exposé-Daten wurden mit Mock-Fallback übernommen (noch kein vollwertiger Scraper)."
        : "Exposé-Import vorbereitet – für dieses Portal/Exposé liegen noch keine auswertbaren Objektdaten vor oder der Scraper hat nichts gefunden.",
      importedUrl: rawUrl,
      portal,
      portalLabel: label,
      type,
      data: {
        kaufpreis,
        nebenkosten,
        zonen,
        meta: {
          rawUrl,
          portal,
          portalLabel: label,
          rawKaufpreis: kaufpreis,
          rawAreaM2:
            zonen && zonen.length
              ? zonen.reduce(
                  (sum: number, z: any) => sum + (z.areaM2 || 0),
                  0
                )
              : null,
          source,
        },
      },
    };

    res.status(200).json(responsePayload);
  } catch (err) {
    console.error("import error", err);
    res.status(500).json({
      ok: false,
      error: "INTERNAL_ERROR",
      message:
        "Unerwarteter Fehler im Import. Bitte probiere es später erneut.",
    });
  }
}
