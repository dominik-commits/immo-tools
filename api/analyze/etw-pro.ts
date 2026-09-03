// api/analyze/etw-pro.ts
// Liefert die PRO-Bausteine des ETW-Analyzers (Score-Breakdown, Handlungsempfehlung,
// volle 10-Jahres-Projektion, ETF-Vergleich).
//
// Die Plan-Prüfung passiert hier serverseitig gegen Clerk (nicht gegen einen vom
// Client mitgeschickten Wert) — ein Free-Account bekommt diese Felder nie in die
// HTTP-Response, unabhängig davon, was das Frontend anzeigt oder verbirgt.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { computeEtwPro, type EtwProInput } from "../../src/core/etwCalc";

function isPro(plan: unknown): boolean {
  return plan === "pro" || plan === "basis";
}

function isValidInput(body: any): body is EtwProInput {
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

  if (!isValidInput(req.body)) {
    return res.status(400).json({ error: "INVALID_PAYLOAD" });
  }

  const result = computeEtwPro(req.body);
  return res.status(200).json(result);
}
