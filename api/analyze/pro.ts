// api/analyze/pro.ts
// Liefert die PRO-Bausteine aller vier Analyzer (Score-Breakdown, Handlungsempfehlung,
// volle 10-Jahres-Projektion, ETF-Vergleich) über einen einzigen Endpoint mit
// `type`-Discriminator statt vier separaten Dateien -- Vercel Hobby erlaubt nur
// 12 Serverless Functions pro Deployment, und vier fast identische Dateien (nur
// die aufgerufene Calc-Funktion unterschied sich) haben unnötig vier davon belegt.
//
// Die Plan-Prüfung passiert weiterhin serverseitig gegen Clerk (nicht gegen einen
// vom Client mitgeschickten Wert) — ein Free-Account bekommt diese Felder nie in
// die HTTP-Response, unabhängig davon, was das Frontend anzeigt oder verbirgt.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { computeEtwPro, type EtwProInput } from "../../src/core/etwCalc";
import { computeMfhPro, type MfhProInput } from "../../src/core/mfhCalc";
import { computeEfhPro, type EfhProInput } from "../../src/core/efhCalc";
import { computeMixedPro, type MixedProInput } from "../../src/core/mixedCalc";

function isPro(plan: unknown): boolean {
  return plan === "pro" || plan === "basis";
}

function isValidEtwInput(body: any): body is EtwProInput {
  return (
    body &&
    typeof body.noiYield === "number" &&
    typeof body.dscr === "number" &&
    typeof body.allIn === "number" &&
    typeof body.wertNOI === "number" &&
    typeof body.monthlyCF === "number" &&
    typeof body.financingOn === "boolean" &&
    typeof body.loan === "number" &&
    typeof body.ltvPct === "number" &&
    (body.bePrice === null || typeof body.bePrice === "number") &&
    typeof body.beRentPerM2 === "number" &&
    typeof body.mieteProM2Monat === "number" &&
    typeof body.effRentYear === "number" &&
    typeof body.opexYear === "number" &&
    typeof body.mietSteigerung === "number" &&
    typeof body.kostenSteigerung === "number" &&
    typeof body.annuitaetJahr === "number" &&
    typeof body.eigenkapital === "number"
  );
}

function isValidMfhInput(body: any): body is MfhProInput {
  return (
    body &&
    typeof body.noiYield === "number" &&
    typeof body.dscr === "number" &&
    typeof body.eigenkapital === "number" &&
    typeof body.monthlyCF === "number" &&
    (body.decisionLabel === "RENTABEL" || body.decisionLabel === "GRENZWERTIG" || body.decisionLabel === "NICHT_RENTABEL") &&
    (body.bePrice === null || typeof body.bePrice === "number") &&
    (body.beRentPerM2 === null || typeof body.beRentPerM2 === "number") &&
    typeof body.kaufpreisView === "number" &&
    typeof body.avgRentPerM2 === "number" &&
    typeof body.effRentYear === "number" &&
    typeof body.nichtUmlagefaehigeKosten === "number" &&
    typeof body.capexPct0 === "number" &&
    typeof body.mietSteigerung === "number" &&
    typeof body.kostenSteigerung === "number" &&
    typeof body.annuitaetJahr === "number"
  );
}

function isValidEfhInput(body: any): body is EfhProInput {
  return (
    body &&
    typeof body.noiYield === "number" &&
    (body.dscr === null || typeof body.dscr === "number") &&
    typeof body.cashflowMonat === "number" &&
    (body.scoreLabel === "BUY" || body.scoreLabel === "CHECK" || body.scoreLabel === "NO") &&
    typeof body.ltvPct === "number" &&
    (body.bePriceEFH === null || typeof body.bePriceEFH === "number") &&
    typeof body.kaufpreis === "number" &&
    typeof body.mieteEffektiv === "number" &&
    typeof body.laufendeKostenJahr === "number" &&
    typeof body.mietSteigerung === "number" &&
    typeof body.kostenSteigerung === "number" &&
    typeof body.financingOn === "boolean" &&
    typeof body.annuityYear === "number" &&
    typeof body.eigenkapitalEFH === "number"
  );
}

function isValidMixedInput(body: any): body is MixedProInput {
  return (
    body &&
    typeof body.noiYield === "number" &&
    (body.dscr === null || typeof body.dscr === "number") &&
    typeof body.valueGapPct === "number" &&
    typeof body.cashflowMonat === "number" &&
    (body.scoreLabel === "BUY" || body.scoreLabel === "CHECK" || body.scoreLabel === "NO") &&
    typeof body.ltvPct === "number" &&
    typeof body.wertAusCap === "number" &&
    typeof body.eigenkapitalMixed === "number" &&
    typeof body.grossW0 === "number" &&
    typeof body.grossG0 === "number" &&
    typeof body.opexW0 === "number" &&
    typeof body.opexG0 === "number" &&
    typeof body.wLeer === "number" &&
    typeof body.gLeer === "number" &&
    typeof body.kaufpreis === "number" &&
    typeof body.financingOn === "boolean" &&
    typeof body.zinsPct === "number" &&
    typeof body.tilgungPct === "number" &&
    typeof body.loan === "number"
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  const { type, ...input } = req.body || {};
  if (type !== "etw" && type !== "mfh" && type !== "efh" && type !== "mixed") {
    return res.status(400).json({ error: "INVALID_TYPE" });
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

  switch (type) {
    case "etw":
      if (!isValidEtwInput(input)) return res.status(400).json({ error: "INVALID_PAYLOAD" });
      return res.status(200).json(computeEtwPro(input));
    case "mfh":
      if (!isValidMfhInput(input)) return res.status(400).json({ error: "INVALID_PAYLOAD" });
      return res.status(200).json(computeMfhPro(input));
    case "efh":
      if (!isValidEfhInput(input)) return res.status(400).json({ error: "INVALID_PAYLOAD" });
      return res.status(200).json(computeEfhPro(input));
    case "mixed":
      if (!isValidMixedInput(input)) return res.status(400).json({ error: "INVALID_PAYLOAD" });
      return res.status(200).json(computeMixedPro(input));
  }
}
