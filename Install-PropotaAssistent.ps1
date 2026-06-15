# ============================================================
#  Propora Assistent – Installations-Skript
#  Ziel: C:\Users\domin\OneDrive\Desktop\Immo-analyzer
# ============================================================

$ProjectRoot = "C:\Users\domin\OneDrive\Desktop\Immo-analyzer"
$ComponentDir = "$ProjectRoot\src\components\Assistent"
$RouteDir     = "$ProjectRoot\src\routes"

Write-Host ""
Write-Host "╔══════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║   Propora Assistent – Installation       ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""

# ── Projektverzeichnis prüfen ──────────────────────────────
if (-not (Test-Path $ProjectRoot)) {
    Write-Host "❌  Projektverzeichnis nicht gefunden: $ProjectRoot" -ForegroundColor Red
    exit 1
}
Write-Host "✅  Projekt gefunden: $ProjectRoot" -ForegroundColor Green

# ── Ordner anlegen ─────────────────────────────────────────
New-Item -ItemType Directory -Force -Path $ComponentDir | Out-Null
Write-Host "📁  Komponenten-Ordner erstellt: $ComponentDir" -ForegroundColor Cyan

# ══════════════════════════════════════════════════════════
#  1) HAUPTKOMPONENTE  src/components/Assistent/index.tsx
# ══════════════════════════════════════════════════════════
$AssistentComponent = @'
import { useState, useRef, useEffect } from "react";

// ── Typen ───────────────────────────────────────────────
interface Message {
  role: "user" | "assistant";
  content: string;
}

// ── Propora-Systemkontext ────────────────────────────────
const SYSTEM_PROMPT = `Du bist der integrierte Assistent von PROPORA – einer Cashflow-Analyse-Software für Immobilien-Investoren in Deutschland.

ÜBER PROPORA:
Propora ist ein Tool für die Rentabilitätsprüfung von Immobilien als Kapitalanlage. Nutzer geben wenige Daten ein (Kaufpreis, Mieteinnahmen, Finanzierungsdaten) und sehen sofort, ob sich ein Investment lohnt.

ZIELGRUPPEN:
- Immobilien-Einsteiger (erster Kauf, erste Analyse)
- Investoren (schnelles Screening vieler Objekte)
- Makler (Aufbereitung für Kunden)

PROPORA FEATURES & TOOLS:

1. CASHFLOW-ANALYSE (Kernfunktion)
   - Eingabe: Kaufpreis, Mieteinnahmen, Kaufnebenkosten, Kreditdaten
   - Ausgabe: Monatlicher Cashflow, Rendite, Break-Even-Analyse
   - Kennzahlen: Bruttorendite, Nettorendite, Cashflow positiv/negativ

2. EXPOSÉ-IMPORT
   - PDF-Import: Exposé hochladen → Daten werden automatisch extrahiert
   - URL-Import: Link von ImmoScout24, Immonet, eBay Kleinanzeigen → automatisches Scraping

3. OBJEKTVERGLEICH
   - Mehrere Objekte parallel analysieren und gegenüberstellen
   - Ranking nach Rendite, Cashflow, Kaufpreis

4. FINANZIERUNGSRECHNER
   - Kreditbetrag, Zinssatz, Tilgung, Laufzeit
   - Berechnet monatliche Rate und Gesamtkosten

5. AfA-RECHNER
   - Wohngebäude: 2% p.a. (50 Jahre), Neubauten ab 2023: 3%
   - Gewerbe: 3% p.a.

6. MIETKALKULATIONSRECHNER
   - Ortsübliche Miete anhand von Mietspiegeln einschätzen
   - Leerstandsrisiko einkalkulieren

WICHTIGE KENNZAHLEN:
- Bruttorendite = (Jahreskaltmiete / Kaufpreis) × 100
- Nettorendite = (Jahresreinertrag / Gesamtinvestition) × 100
- Cashflow = Mieteinnahmen - Rate - Nebenkosten - Rücklagen
- Kaufpreisfaktor = Kaufpreis / Jahreskaltmiete
- Gute Bruttorendite: mind. 4-5% (je nach Lage)
- Kaufpreisfaktor unter 25 gilt meist als gut

DEINE AUFGABE:
- Beantworte alle Fragen zu Propora, Immobilien-Investment und den Tools
- Erkläre Formeln und Kennzahlen klar und praxisnah
- Gib konkrete Tipps für Einsteiger
- Antworte auf Deutsch, klar und präzise
- Halte Antworten kompakt (3-6 Sätze wenn möglich)`;

// ── Quick-Chips ──────────────────────────────────────────
const CHIPS = [
  { label: "Cashflow",      icon: "💰", question: "Erkläre mir die Cashflow-Analyse" },
  { label: "Exposé-Import", icon: "📄", question: "Wie funktioniert der Exposé-Import?" },
  { label: "Finanzierung",  icon: "🏦", question: "Erkläre mir den Finanzierungsrechner" },
  { label: "AfA-Rechner",   icon: "📊", question: "Was ist der AfA-Rechner?" },
  { label: "Vergleich",     icon: "⚖️", question: "Wie vergleiche ich mehrere Objekte?" },
  { label: "Rendite",       icon: "📈", question: "Was ist eine gute Bruttorendite?" },
];

const QUICK_ACTIONS = [
  { icon: "🚀", title: "Erste Analyse",     sub: "Wo fange ich an?",          q: "Wie starte ich meine erste Immobilienanalyse?" },
  { icon: "🛠️", title: "Alle Tools",        sub: "Was kann Propora?",         q: "Welche Tools bietet Propora?" },
  { icon: "📥", title: "Exposé importieren", sub: "Von ImmoScout & Co.",       q: "Wie importiere ich ein Exposé von ImmoScout?" },
  { icon: "📐", title: "Rendite berechnen", sub: "Formel & Tipps",            q: "Wie berechne ich die Bruttorendite?" },
];

// ── Hilfsfunktion: Markdown-light → HTML ─────────────────
function formatBot(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, "<br/>");
}

// ════════════════════════════════════════════════════════
//  Haupt-Komponente
// ════════════════════════════════════════════════════════
export default function PropraAssistent() {
  const [messages, setMessages]   = useState<Message[]>([]);
  const [input, setInput]         = useState("");
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const textRef                   = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // ── API-Aufruf ─────────────────────────────────────────
  async function callClaude(history: Message[]) {
    const res = await fetch("/api/assistent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    if (!res.ok) throw new Error("API-Fehler");
    const data = await res.json();
    return data.content?.[0]?.text ?? "Keine Antwort erhalten.";
  }

  // ── Nachricht senden ───────────────────────────────────
  async function send(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput("");

    const newHistory: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(newHistory);
    setLoading(true);

    try {
      const reply = await callClaude(newHistory);
      setMessages([...newHistory, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...newHistory, { role: "assistant", content: "Verbindungsfehler. Bitte versuche es erneut." }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const hasMessages = messages.length > 0;

  // ══════════════════════════════════════════════════════
  //  Render
  // ══════════════════════════════════════════════════════
  return (
    <>
      {/* ── Floating Button ── */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 1000,
          width: 56, height: 56,
          background: "#FCDC45", border: "none", borderRadius: 14,
          cursor: "pointer", boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
          fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center",
          transition: "transform 0.15s",
        }}
        title="Propora Assistent öffnen"
      >
        {open ? "✕" : "P"}
      </button>

      {/* ── Chat-Panel ── */}
      {open && (
        <div style={{
          position: "fixed", bottom: 96, right: 28, zIndex: 999,
          width: 400, height: 580,
          background: "#181c27", borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column",
          fontFamily: "'DM Sans', sans-serif",
          overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "12px 16px",
            background: "#1e2336",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}>
            <div style={{
              width: 34, height: 34, background: "#FCDC45",
              borderRadius: 9, display: "flex", alignItems: "center",
              justifyContent: "center", fontWeight: 700, color: "#141824",
              fontSize: 18, flexShrink: 0,
            }}>P</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f0" }}>Propora Assistent</div>
              <div style={{ fontSize: 11, color: "#8b8fa8" }}>Immobilien-Investmentberater</div>
            </div>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: "#3cb87a", boxShadow: "0 0 6px rgba(60,184,122,0.6)",
            }}/>
          </div>

          {/* Chips */}
          <div style={{
            display: "flex", gap: 6, padding: "8px 12px",
            background: "#1e2336", borderBottom: "1px solid rgba(255,255,255,0.08)",
            overflowX: "auto", flexShrink: 0,
          }}>
            {CHIPS.map(c => (
              <button key={c.label} onClick={() => send(c.question)} style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "4px 10px", background: "#0f1117",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 20, fontSize: 11, color: "#8b8fa8",
                cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0,
              }}>
                <span>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto", padding: "14px 14px 4px",
            display: "flex", flexDirection: "column", gap: 12,
          }}>

            {/* Welcome screen */}
            {!hasMessages && (
              <div style={{ textAlign: "center", padding: "12px 0" }}>
                <div style={{ fontSize: 13, color: "#8b8fa8", marginBottom: 16, lineHeight: 1.6 }}>
                  Frag mich zu Immobilien-Investments,<br/>Renditen, Tools oder Strategien.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {QUICK_ACTIONS.map(qa => (
                    <button key={qa.title} onClick={() => send(qa.q)} style={{
                      background: "#1e2336", border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10, padding: "10px 12px", cursor: "pointer",
                      textAlign: "left", transition: "border-color 0.15s",
                    }}>
                      <div style={{ fontSize: 16, marginBottom: 4 }}>{qa.icon}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#f0f0f0" }}>{qa.title}</div>
                      <div style={{ fontSize: 11, color: "#8b8fa8", marginTop: 2 }}>{qa.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Nachrichten */}
            {messages.map((m, i) => (
              <div key={i} style={{
                display: "flex", gap: 8,
                flexDirection: m.role === "user" ? "row-reverse" : "row",
                alignItems: "flex-end",
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                  background: m.role === "user" ? "rgba(74,111,212,0.2)" : "#FCDC45",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: m.role === "user" ? 12 : 15,
                  color: m.role === "user" ? "#4a6fd4" : "#141824",
                  fontWeight: 700,
                }}>
                  {m.role === "user" ? "👤" : "P"}
                </div>
                <div style={{
                  maxWidth: "78%",
                  background: m.role === "user" ? "#4a6fd4" : "#1e2336",
                  color: "#f0f0f0", fontSize: 13, lineHeight: 1.6,
                  padding: "9px 13px",
                  borderRadius: m.role === "user"
                    ? "12px 4px 12px 12px"
                    : "4px 12px 12px 12px",
                  border: m.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}
                  dangerouslySetInnerHTML={{ __html: m.role === "assistant" ? formatBot(m.content) : m.content }}
                />
              </div>
            ))}

            {/* Typing */}
            {loading && (
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 7, background: "#FCDC45",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 700, color: "#141824", flexShrink: 0,
                }}>P</div>
                <div style={{
                  background: "#1e2336", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "4px 12px 12px 12px", padding: "10px 14px",
                  display: "flex", gap: 4, alignItems: "center",
                }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: "50%", background: "#8b8fa8",
                      animation: "bounce 1.2s infinite",
                      animationDelay: `${i * 0.2}s`,
                    }}/>
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{
            padding: "10px 14px 14px",
            background: "#1e2336",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            flexShrink: 0,
          }}>
            <div style={{
              display: "flex", gap: 8, alignItems: "flex-end",
              background: "#0f1117", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 10, padding: "8px 12px",
            }}>
              <textarea
                ref={textRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Frag mich zu Immobilien, Renditen, Tools..."
                rows={1}
                style={{
                  flex: 1, background: "transparent", border: "none",
                  outline: "none", color: "#f0f0f0",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13, resize: "none", lineHeight: 1.5,
                  maxHeight: 80,
                }}
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                style={{
                  width: 32, height: 32, background: "#FCDC45",
                  border: "none", borderRadius: 8, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0,
                  opacity: loading || !input.trim() ? 0.4 : 1,
                }}
              >➤</button>
            </div>
            <div style={{ fontSize: 10, color: "#8b8fa8", textAlign: "center", marginTop: 6 }}>
              Powered by Claude · Propora Immobilien-KI
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
'@

Set-Content -Path "$ComponentDir\index.tsx" -Value $AssistentComponent -Encoding UTF8
Write-Host "✅  Komponente erstellt: src/components/Assistent/index.tsx" -ForegroundColor Green

# ══════════════════════════════════════════════════════════
#  2) API ROUTE  src/api/assistent.ts  (Vite/React Router)
#     oder pages/api/assistent.ts (Next.js)
# ══════════════════════════════════════════════════════════

# Prüfen ob Next.js (pages-Verzeichnis) oder Vite
$IsNextJs = Test-Path "$ProjectRoot\pages"
$IsVite   = Test-Path "$ProjectRoot\vite.config.ts" -or (Test-Path "$ProjectRoot\vite.config.js")

if ($IsNextJs) {
    $ApiDir = "$ProjectRoot\pages\api"
    New-Item -ItemType Directory -Force -Path $ApiDir | Out-Null
    $ApiPath = "$ApiDir\assistent.ts"
    $ApiCode = @'
import type { NextApiRequest, NextApiResponse } from "next";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `Du bist der integrierte Assistent von PROPORA – einer Cashflow-Analyse-Software für Immobilien-Investoren in Deutschland. Beantworte Fragen zu Tools, Kennzahlen und Immobilien-Investment auf Deutsch, klar und präzise.`;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { messages } = req.body;
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages,
    });
    res.status(200).json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "API-Fehler" });
  }
}
'@
    Set-Content -Path $ApiPath -Value $ApiCode -Encoding UTF8
    Write-Host "✅  API Route erstellt: pages/api/assistent.ts (Next.js)" -ForegroundColor Green
} else {
    # Vite/Express – separate server-Datei
    $ApiDir = "$ProjectRoot\server"
    New-Item -ItemType Directory -Force -Path $ApiDir | Out-Null
    $ApiPath = "$ApiDir\assistent.ts"
    $ApiCode = @'
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = express.Router();
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Du bist der integrierte Assistent von PROPORA – einer Cashflow-Analyse-Software für Immobilien-Investoren in Deutschland. Beantworte Fragen zu Tools, Kennzahlen und Immobilien-Investment auf Deutsch, klar und präzise.`;

router.post("/api/assistent", async (req, res) => {
  try {
    const { messages } = req.body;
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages,
    });
    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "API-Fehler" });
  }
});

export default router;
'@
    Set-Content -Path $ApiPath -Value $ApiCode -Encoding UTF8
    Write-Host "✅  API Route erstellt: server/assistent.ts (Express/Vite)" -ForegroundColor Green
}

# ══════════════════════════════════════════════════════════
#  3) .env.local – API Key Platzhalter
# ══════════════════════════════════════════════════════════
$EnvFile = "$ProjectRoot\.env.local"
if (-not (Test-Path $EnvFile)) {
    "ANTHROPIC_API_KEY=sk-ant-DEINEN-KEY-HIER-EINTRAGEN" | Set-Content -Path $EnvFile -Encoding UTF8
    Write-Host "✅  .env.local erstellt (API Key eintragen!)" -ForegroundColor Yellow
} else {
    $envContent = Get-Content $EnvFile -Raw
    if ($envContent -notmatch "ANTHROPIC_API_KEY") {
        Add-Content -Path $EnvFile -Value "`nANTHROPIC_API_KEY=sk-ant-DEINEN-KEY-HIER-EINTRAGEN"
        Write-Host "✅  ANTHROPIC_API_KEY zu .env.local hinzugefügt" -ForegroundColor Yellow
    } else {
        Write-Host "ℹ️   ANTHROPIC_API_KEY bereits in .env.local vorhanden" -ForegroundColor Cyan
    }
}

# ══════════════════════════════════════════════════════════
#  4) npm install @anthropic-ai/sdk
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "📦  Installiere @anthropic-ai/sdk ..." -ForegroundColor Cyan
Set-Location $ProjectRoot
npm install @anthropic-ai/sdk --save 2>&1 | Out-Null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅  @anthropic-ai/sdk installiert" -ForegroundColor Green
} else {
    Write-Host "⚠️   npm install fehlgeschlagen – bitte manuell ausführen:" -ForegroundColor Yellow
    Write-Host "    cd `"$ProjectRoot`"" -ForegroundColor Gray
    Write-Host "    npm install @anthropic-ai/sdk" -ForegroundColor Gray
}

# ══════════════════════════════════════════════════════════
#  5) Einbindungs-Hinweis
# ══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║   LETZTER SCHRITT – Komponente einbinden                     ║" -ForegroundColor Yellow
Write-Host "╠══════════════════════════════════════════════════════════════╣" -ForegroundColor Yellow
Write-Host "║                                                              ║" -ForegroundColor Yellow
Write-Host "║  Öffne deine App.tsx (oder Root-Layout) und füge hinzu:      ║" -ForegroundColor Yellow
Write-Host "║                                                              ║" -ForegroundColor Yellow
Write-Host "║  import PropraAssistent from './components/Assistent';       ║" -ForegroundColor Yellow
Write-Host "║                                                              ║" -ForegroundColor Yellow
Write-Host "║  Dann ganz am Ende vor dem letzten </div>:                   ║" -ForegroundColor Yellow
Write-Host "║  <PropraAssistent />                                         ║" -ForegroundColor Yellow
Write-Host "║                                                              ║" -ForegroundColor Yellow
Write-Host "║  Danach deinen Anthropic API Key in .env.local eintragen!    ║" -ForegroundColor Yellow
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""
Write-Host "🎉  Installation abgeschlossen!" -ForegroundColor Green
Write-Host ""
