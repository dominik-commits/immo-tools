// src/core/afa/presets.ts
import { AfaInput, AfaPresetKey } from "./types";

export const AFA_PRESETS: Record<AfaPresetKey, Partial<AfaInput>> = {
  LIN_WOHN: { method:"linear", years:50, ratePct:undefined },
  LIN_GEWERBE: { method:"linear", years:33, ratePct:undefined },
  DEG_TEST: { method:"degressiv", ratePct:0.05, years:undefined },
  CUSTOM: {}
};
