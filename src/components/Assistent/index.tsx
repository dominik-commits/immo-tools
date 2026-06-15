import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SYSTEM_PROMPT = `Du bist der integrierte Assistent von PROPORA – einer Cashflow-Analyse-Software für Immobilien-Investoren in Deutschland.

ÜBER PROPORA:
Propora analysiert Immobilien als Kapitalanlage. Nutzer geben wenige Daten ein (Kaufpreis, Mieteinnahmen, Finanzierungsdaten) und sehen sofort, ob sich ein Investment lohnt.

ZIELGRUPPEN:
- Immobilien-Einsteiger (erster Kauf, erste Analyse)
- Investoren (schnelles Screening vieler Objekte)
- Makler (Aufbereitung für Kunden)

PROPORA TOOLS:
1. CASHFLOW-ANALYSE – Kaufpreis, Miete, Nebenkosten, Kredit → Cashflow, Rendite, Break-Even
2. EXPOSÉ-IMPORT – PDF oder URL (ImmoScout, Immonet, eBay) → automatische Datenerkennung
3. OBJEKTVERGLEICH – mehrere Objekte parallel vergleichen, Ranking nach Rendite
4. FINANZIERUNGSRECHNER – Rate, Zinsen, Tilgung, Laufzeit
5. AfA-RECHNER – steuerliche Abschreibung (Wohnen 2%, Neubau ab 2023: 3%, Gewerbe 3%)
6. MIETKALKULATIONSRECHNER – Mietspiegel, Leerstandsrisiko

KENNZAHLEN:
- Bruttorendite = (Jahreskaltmiete / Kaufpreis) × 100 → mind. 4–5% anstreben
- Kaufpreisfaktor = Kaufpreis / Jahreskaltmiete → unter 25 ist gut
- Nettorendite = Jahresreinertrag / Gesamtinvestition × 100
- Cashflow = Miete - Kreditrate - Rücklagen - Nebenkosten

Antworte auf Deutsch, klar und kompakt (3–6 Sätze). Nutze **Fettschrift** für wichtige Begriffe.`;

const CHIPS = [
  { label: "Cashflow",       icon: "💰", q: "Erkläre mir die Cashflow-Analyse" },
  { label: "Exposé-Import",  icon: "📄", q: "Wie funktioniert der Exposé-Import?" },
  { label: "Finanzierung",   icon: "🏦", q: "Erkläre mir den Finanzierungsrechner" },
  { label: "AfA-Rechner",    icon: "📊", q: "Was ist der AfA-Rechner?" },
  { label: "Vergleich",      icon: "⚖️", q: "Wie vergleiche ich mehrere Objekte?" },
  { label: "Rendite",        icon: "📈", q: "Was ist eine gute Bruttorendite?" },
];

const QUICK_ACTIONS = [
  { icon: "🚀", title: "Erste Analyse",      sub: "Wo fange ich an?",     q: "Wie starte ich meine erste Immobilienanalyse?" },
  { icon: "🛠️", title: "Alle Tools",         sub: "Was kann Propora?",    q: "Welche Tools bietet Propora?" },
  { icon: "📥", title: "Exposé importieren", sub: "Von ImmoScout & Co.",  q: "Wie importiere ich ein Exposé von ImmoScout?" },
  { icon: "📐", title: "Rendite berechnen",  sub: "Formel & Tipps",       q: "Wie berechne ich die Bruttorendite?" },
];

function fmt(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

export default function PropraAssistent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [open, setOpen]         = useState(false);
  const bottomRef               = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text?: string) {
    const userText = (text ?? input).trim();
    if (!userText || loading) return;
    setInput("");
    const hist: Message[] = [...messages, { role: "user", content: userText }];
    setMessages(hist);
    setLoading(true);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY ?? "",
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: hist,
        }),
      });
      const data = await res.json();
      const reply = data.content?.[0]?.text ?? "Keine Antwort erhalten.";
      setMessages([...hist, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...hist, { role: "assistant", content: "Verbindungsfehler. Bitte versuche es erneut." }]);
    } finally {
      setLoading(false);
    }
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: "fixed", bottom: 28, right: 28, zIndex: 1000,
          width: 56, height: 56, background: "#FCDC45", border: "none",
          borderRadius: 14, cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
          fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center",
        }}
        title="Propora Assistent"
      >
        {open ? "✕" : "P"}
      </button>

      {open && (
        <div style={{
          position: "fixed", bottom: 96, right: 28, zIndex: 999,
          width: 400, height: 580, background: "#181c27", borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
          display: "flex", flexDirection: "column",
          fontFamily: "inherit", overflow: "hidden",
        }}>

          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"#1e2336", borderBottom:"1px solid rgba(255,255,255,0.08)", flexShrink:0 }}>
            <div style={{ width:34, height:34, background:"#FCDC45", borderRadius:9, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700, color:"#141824", fontSize:18 }}>P</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:14, fontWeight:600, color:"#f0f0f0" }}>Propora Assistent</div>
              <div style={{ fontSize:11, color:"#8b8fa8" }}>Immobilien-Investmentberater</div>
            </div>
            <div style={{ width:8, height:8, borderRadius:"50%", background:"#3cb87a", boxShadow:"0 0 6px rgba(60,184,122,0.6)" }}/>
          </div>

          {/* Chips */}
          <div style={{ display:"flex", gap:6, padding:"8px 12px", background:"#1e2336", borderBottom:"1px solid rgba(255,255,255,0.08)", overflowX:"auto", flexShrink:0, scrollbarWidth:"none" }}>
            {CHIPS.map(c => (
              <button key={c.label} onClick={() => send(c.q)} style={{ display:"flex", alignItems:"center", gap:5, padding:"4px 10px", background:"#0f1117", border:"1px solid rgba(255,255,255,0.08)", borderRadius:20, fontSize:11, color:"#8b8fa8", cursor:"pointer", whiteSpace:"nowrap", flexShrink:0 }}>
                <span>{c.icon}</span>{c.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:"14px 14px 4px", display:"flex", flexDirection:"column", gap:12 }}>
            {messages.length === 0 && (
              <div style={{ textAlign:"center", padding:"8px 0" }}>
                <div style={{ fontSize:13, color:"#8b8fa8", marginBottom:16, lineHeight:1.6 }}>
                  Frag mich zu Immobilien-Investments,<br/>Renditen, Tools oder Strategien.
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {QUICK_ACTIONS.map(qa => (
                    <button key={qa.title} onClick={() => send(qa.q)} style={{ background:"#1e2336", border:"1px solid rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 12px", cursor:"pointer", textAlign:"left" }}>
                      <div style={{ fontSize:16, marginBottom:4 }}>{qa.icon}</div>
                      <div style={{ fontSize:12, fontWeight:600, color:"#f0f0f0" }}>{qa.title}</div>
                      <div style={{ fontSize:11, color:"#8b8fa8", marginTop:2 }}>{qa.sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} style={{ display:"flex", gap:8, flexDirection: m.role === "user" ? "row-reverse" : "row", alignItems:"flex-end" }}>
                <div style={{ width:28, height:28, borderRadius:7, flexShrink:0, background: m.role === "user" ? "rgba(74,111,212,0.2)" : "#FCDC45", display:"flex", alignItems:"center", justifyContent:"center", fontSize: m.role === "user" ? 12 : 15, color: m.role === "user" ? "#4a6fd4" : "#141824", fontWeight:700 }}>
                  {m.role === "user" ? "👤" : "P"}
                </div>
                <div
                  style={{ maxWidth:"78%", background: m.role === "user" ? "#4a6fd4" : "#1e2336", color:"#f0f0f0", fontSize:13, lineHeight:1.6, padding:"9px 13px", borderRadius: m.role === "user" ? "12px 4px 12px 12px" : "4px 12px 12px 12px", border: m.role === "assistant" ? "1px solid rgba(255,255,255,0.08)" : "none" }}
                  dangerouslySetInnerHTML={{ __html: m.role === "assistant" ? fmt(m.content) : m.content }}
                />
              </div>
            ))}

            {loading && (
              <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
                <div style={{ width:28, height:28, borderRadius:7, background:"#FCDC45", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, fontWeight:700, color:"#141824", flexShrink:0 }}>P</div>
                <div style={{ background:"#1e2336", border:"1px solid rgba(255,255,255,0.08)", borderRadius:"4px 12px 12px 12px", padding:"10px 14px", display:"flex", gap:4 }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"#8b8fa8", animation:"pbounce 1.2s infinite", animationDelay:`${i*0.2}s` }}/>)}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ padding:"10px 14px 14px", background:"#1e2336", borderTop:"1px solid rgba(255,255,255,0.08)", flexShrink:0 }}>
            <div style={{ display:"flex", gap:8, alignItems:"flex-end", background:"#0f1117", border:"1px solid rgba(255,255,255,0.12)", borderRadius:10, padding:"8px 12px" }}>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Frag mich zu Immobilien, Renditen, Tools..."
                rows={1}
                style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"#f0f0f0", fontFamily:"inherit", fontSize:13, resize:"none", lineHeight:1.5, maxHeight:80 }}
              />
              <button onClick={() => send()} disabled={loading || !input.trim()} style={{ width:32, height:32, background:"#FCDC45", border:"none", borderRadius:8, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0, opacity: loading || !input.trim() ? 0.4 : 1 }}>
                ➤
              </button>
            </div>
            <div style={{ fontSize:10, color:"#8b8fa8", textAlign:"center", marginTop:6 }}>Powered by Claude · Propora Immobilien-KI</div>
          </div>
        </div>
      )}
      <style>{`@keyframes pbounce { 0%,60%,100%{transform:translateY(0);opacity:0.4} 30%{transform:translateY(-4px);opacity:1} }`}</style>
    </>
  );
}
