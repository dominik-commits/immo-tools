// src/core/afa/calcs.ts
import { AfaInput, AfaOutput, Modernisierung, AfAMethod } from "./types";

export function calcGebaeudeAnteil(input: AfaInput): number {
  const g = Math.max(0, input.kaufpreis - Math.max(0, input.bodenwert));
  return g;
}

function afaLinear(amount: number, years: number): number {
  if (amount <= 0 || years <= 0) return 0;
  return amount / years;
}

function afaDegressiv(amount: number, ratePct: number): (yearIndex:number)=>number {
  // klassisch degressiv: Jahr t = Restwert_{t-1} * rate
  const rate = ratePct;
  return (t) => amount * rate * Math.pow(1 - rate, t - 1);
}

function distributeOverYears(amount:number, years:number): number[] {
  if (amount<=0 || years<=0) return [];
  const p = amount/years;
  return Array.from({length: years}, ()=>p);
}

export function buildAfaTable(input: AfaInput): AfaOutput {
  const H = input.horizonYears;
  const gebaeudeAnteil = calcGebaeudeAnteil(input);

  // Hauptstrang
  const mainParts: number[] = Array(H).fill(0);
  if (input.method === "linear") {
    const y = input.years ?? 50;
    const pa = afaLinear(gebaeudeAnteil, y);
    for (let t=0; t<H; t++) mainParts[t] = pa;
  } else if (input.method === "degressiv") {
    const rate = input.ratePct ?? 0.02;
    const f = afaDegressiv(gebaeudeAnteil, rate);
    for (let t=0; t<H; t++) mainParts[t] = f(t+1);
  }

  // Modernisierungen -> jeweils eigener Strang
  const modParts: Record<string, number[]> = {};
  for (const m of input.modernisierungen) {
    const arr = Array(H).fill(0);
    const amount = m.capitalize ? m.amount : 0;
    if (amount > 0) {
      if (m.method === "linear") {
        const y = m.years ?? 10;
        const pa = afaLinear(amount, y);
        for (let t=0; t<H; t++) arr[t] = pa;
      } else if (m.method === "degressiv") {
        const rate = m.ratePct ?? 0.05;
        const f = afaDegressiv(amount, rate);
        for (let t=0; t<H; t++) arr[t] = f(t+1);
      }
    }
    modParts[m.id] = arr;
  }

  // Sonderbeträge: einfache lineare Verteilung
  const sonderParts: Record<string, number[]> = {};
  for (const s of input.sonderBetraege) {
    sonderParts[s.title] = distributeOverYears(s.amount, s.years).slice(0, H);
    if (sonderParts[s.title].length < H) {
      // restliche Jahre 0
      sonderParts[s.title] = [
        ...sonderParts[s.title],
        ...Array(H - sonderParts[s.title].length).fill(0),
      ];
    }
  }

  // Aggregation je Jahr
  const baseYear = new Date(input.nutzungsbeginnISO || input.anschaffungsdatumISO || new Date()).getFullYear();
  const jahre = Array.from({length: H}, (_,i)=> {
    const haupt = mainParts[i] ?? 0;
    const modernisierungen = Object.entries(modParts).map(([id, arr]) => ({ id, value: arr[i] ?? 0 }));
    const sonder = Object.entries(sonderParts).map(([title, arr]) => ({ title, value: arr[i] ?? 0 }));
    const sum = haupt
      + modernisierungen.reduce((s,a)=>s+a.value,0)
      + sonder.reduce((s,a)=>s+a.value,0);
    return {
      yearIndex: i+1,
      kalenderjahr: baseYear + i,
      afaSum: sum,
      parts: { haupt, modernisierungen, sonder }
    };
  });

  return {
    gebaeudeAnteil,
    jahre,
    totalAfaHorizon: jahre.reduce((s,r)=>s+r.afaSum,0)
  };
}

