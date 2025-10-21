import type { AnalysisInput, AnalysisResult, SensitivityResponse } from './types'

const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8010'

export async function analyze(input: AnalysisInput): Promise<AnalysisResult> {
  const r = await fetch(`${API}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!r.ok) throw new Error(`Analyze failed: ${r.status}`)
  return r.json()
}

export async function analyzeSensitivity(payload: {
  base: AnalysisInput
  interest_delta_pct: number
  rent_delta_pct: number
}): Promise<SensitivityResponse> {
  const r = await fetch(`${API}/analyze/sensitivity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error(`Sensitivity failed: ${r.status}`)
  return r.json()
}

export async function downloadPdf(input: AnalysisInput): Promise<Blob> {
  // Placeholder – falls dein Backend den PDF-Endpoint bereits hat.
  const r = await fetch(`${API}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!r.ok) throw new Error('PDF-Erzeugung nicht implementiert')
  // Dummy: erzeugen wir lokal eine Minimal-"PDF"-Datei? (hier: JSON-Blob)
  return new Blob([JSON.stringify(await r.json(), null, 2)], { type: 'application/json' })
}

