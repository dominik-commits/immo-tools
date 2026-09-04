// api/export-pdf.ts
// Erzeugt den "Bankbericht" (PDF) komplett serverseitig für alle vier Analyzer.
// PDF-Export ist ein PRO-Feature -- die Plan-Prüfung passiert hier gegen Clerk,
// bevor überhaupt ein PDF gebaut wird. Vorher lief die jsPDF-Erzeugung komplett
// im Browser; ein Free-User hätte die Client-Funktion trotz gesperrtem Button
// theoretisch direkt aus der Konsole aufrufen können. Jetzt existiert das PDF
// serverseitig überhaupt nur, wenn der Aufrufer nachweislich PRO ist.

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { clerkClient } from "@clerk/clerk-sdk-node";
import { generateWohnungPdf, type WohnungReportData } from "../src/utils/generateWohnungPdf";
import { generateMFHPdf, type MFHReportData } from "../src/utils/generateMFHPdf";
import { generateEFHPdf, type EFHReportData } from "../src/utils/generateEFHPdf";
import { generateMixedUsePdf, type MixedUseReportData } from "../src/utils/generateMixedUsePdf";
import { generateGewerbePdf, type GewerbeReportData } from "../src/utils/generateGewerbePdf";

function isPro(plan: unknown): boolean {
  return plan === "pro" || plan === "basis";
}

type ReportType = "etw" | "mfh" | "efh" | "mixed" | "gewerbe";

function isValidType(t: unknown): t is ReportType {
  return t === "etw" || t === "mfh" || t === "efh" || t === "mixed" || t === "gewerbe";
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

  const { type, data } = req.body || {};
  if (!isValidType(type) || !data || typeof data !== "object") {
    return res.status(400).json({ error: "INVALID_PAYLOAD" });
  }

  try {
    let result: { bytes: Uint8Array; filename: string };
    switch (type) {
      case "etw":
        result = generateWohnungPdf(data as WohnungReportData);
        break;
      case "mfh":
        result = generateMFHPdf(data as MFHReportData);
        break;
      case "efh":
        result = generateEFHPdf(data as EFHReportData);
        break;
      case "mixed":
        result = generateMixedUsePdf(data as MixedUseReportData);
        break;
      case "gewerbe":
        result = generateGewerbePdf(data as GewerbeReportData);
        break;
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename.replace(/"/g, "")}"`);
    return res.status(200).end(Buffer.from(result.bytes));
  } catch (err) {
    console.error("export-pdf error", err);
    return res.status(500).json({ error: "PDF_GENERATION_FAILED" });
  }
}
