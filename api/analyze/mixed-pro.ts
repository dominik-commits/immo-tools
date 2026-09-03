// api/analyze/mixed-pro.ts
// Liefert die PRO-Bausteine des Gemischte-Immobilie-Analyzers (Score-Breakdown,
// Handlungsempfehlung, volle 10-Jahres-Projektion, ETF-Vergleich). Plan-Prüfung
// serverseitig gegen Clerk -- siehe api/analyze/etw-pro.ts für die ausführliche
// Begründung des Musters.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { computeMixedPro, type MixedProInput } from "../../src/core/mixedCalc";

function isPro(plan: unknown): boolean {
  return plan === "pro" || plan === "basis";
}

function isValidInput(body: any): body is MixedProInput {
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

  const result = computeMixedPro(req.body);
  return res.status(200).json(result);
}
