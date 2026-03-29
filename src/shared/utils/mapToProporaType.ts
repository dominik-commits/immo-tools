// shared/utils/mapToProporaType.ts

import { ProporaAssetType, RawListingPayload } from "../types/extension";

export function mapToProporaType(raw: RawListingPayload): ProporaAssetType {
  const t = (raw.rawType || raw.title || "").toLowerCase();
  const usage = (raw.usageCategory || "").toLowerCase();

  if (t.includes("wohnung") || t.includes("etw") || t.includes("apartment"))
    return "ETW";

  if (t.includes("einfamilienhaus") || t.includes("efh") || t.includes("reihenhaus"))
    return "EFH";

  if (t.includes("mehrfamilienhaus") || t.includes("mfh") || (raw.unitsTotal ?? 0) >= 3)
    return "MFH";

  if (t.includes("wohn- und geschäftshaus") || usage.includes("wohnen und gewerbe"))
    return "MIXED";

  if (usage.includes("gewerbe") || t.includes("büro") || t.includes("logistik"))
    return "GEWERBE";

  return "GEWERBE";
}