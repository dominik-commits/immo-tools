import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useUser, useSignUp } from "@clerk/clerk-react";
import { Shield, Eye, EyeOff, ArrowRight, Lock } from "lucide-react";

// Design-Tokens 1:1 aus dem Checkout-Mockup übernommen (Linear/Stripe/Vercel-
// artiger, heller Checkout-Container auf dunklem Navy-Grund). Ersetzt die
// vorherige propora-web-Umsetzung (dunkle Cards, Manrope) -- bewusste
// Design-Entscheidung für diese eine Seite, kein Rückschritt.
const C = {
  navy950: "#080c18",
  blue500: "#3d63ff",
  blue600: "#2f4fe0",
  yellow400: "#f4c430",
  yellow500: "#eab90c",
  paper: "#fbfbfd",
  ink900: "#10162a",
  ink700: "#3a4260",
  ink500: "#6b7290",
  line: "#e6e8f0",
  lineSoft: "#eef0f6",
};
const FONT = "'Inter', system-ui, -apple-system, sans-serif";
const RADIUS_CARD = 20;
const RADIUS_INPUT = 11;
const SHADOW_CARD = "0 30px 60px -25px rgba(5,10,30,.45), 0 2px 8px rgba(5,10,30,.06)";

const PLAN_PRICES: Record<"yearly" | "monthly", { amount: string; cadence: string }> = {
  yearly: { amount: "199 €", cadence: "pro Jahr · jährlich abgerechnet, zzgl. MwSt." },
  monthly: { amount: "19 €", cadence: "pro Monat · monatlich abgerechnet, zzgl. MwSt." },
};

// Die 5 stärksten Benefits statt der vollen Feature-Liste -- der Nutzer hat
// sich schon entschieden, hier zählt Bestätigung, nicht nochmal überzeugen.
const TOP_BENEFITS = [
  "Alle 5 Analyzer inkl. Score & Handlungsempfehlung",
  "Volle 10-Jahres-Projektion",
  "Finanzierungsvergleich",
  "PDF-Export für Bankgespräche",
  "Objektvergleich & Abschreibungsplaner",
];

function BenefitCheck() {
  return (
    <svg width="17" height="17" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <circle cx="10" cy="10" r="10" fill={C.blue500} fillOpacity="0.12" />
      <path d="M6 10.2l2.6 2.6L14.4 7" stroke={C.blue500} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill={C.yellow400}>
      <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6L1.3 7.7l6.1-.6L10 1.5z" />
    </svg>
  );
}

/** Kleines, wiederverwendbares Eingabefeld -- eigene Inputs statt Clerk-Widget,
 *  damit Höhe/Padding/box-sizing vollständig unter eigener Kontrolle bleiben
 *  (das war die Ursache der abgeschnittenen Felder: Clerks internes Markup
 *  ließ sich dafür nicht zuverlässig genug über `appearance` durchsteuern). */
function Field({
  id, label, type = "text", value, onChange, placeholder, autoComplete, required = true, rightAdorn,
}: {
  id: string; label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string; required?: boolean; rightAdorn?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 16, minWidth: 0 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 600, color: C.ink700 }}>{label}</label>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          style={{
            width: "100%",
            height: 50,
            padding: rightAdorn ? "0 44px 0 15px" : "0 15px",
            borderRadius: RADIUS_INPUT,
            border: `1px solid ${C.line}`,
            background: "#fff",
            fontSize: 14.5,
            fontFamily: FONT,
            color: C.ink900,
            boxSizing: "border-box",
            outline: "none",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = C.blue500;
            e.currentTarget.style.boxShadow = "0 0 0 3px rgba(61,99,255,.14)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = C.line;
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {rightAdorn && (
          <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }}>{rightAdorn}</div>
        )}
      </div>
    </div>
  );
}

function CheckboxRow({
  id, checked, onChange, children,
}: {
  id: string; checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode;
}) {
  return (
    <label htmlFor={id} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12, cursor: "pointer" }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
      />
      <span
        style={{
          width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
          border: checked ? "none" : "1.5px solid #c7cbdb",
          background: checked ? C.blue500 : "transparent",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 5.2l2.3 2.3L8.5 2.3" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span style={{ fontSize: 13, lineHeight: 1.5, color: C.ink700 }}>{children}</span>
    </label>
  );
}

function OrderSummary({ interval, showReview = true }: { interval: "yearly" | "monthly"; showReview?: boolean }) {
  const price = PLAN_PRICES[interval];
  return (
    <div
      style={{
        padding: "44px 38px",
        background: "linear-gradient(180deg, #f4f6fb 0%, #fbfbfd 55%)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <p style={{ fontSize: 12.5, fontWeight: 700, color: C.blue600, letterSpacing: "0.02em", margin: "0 0 10px" }}>PROPORA PRO</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 36, fontWeight: 800, color: C.ink900, letterSpacing: "-0.02em" }}>{price.amount}</span>
      </div>
      <p style={{ fontSize: 13.5, color: C.ink500, margin: "0 0 26px" }}>{price.cadence}</p>

      <ul style={{ listStyle: "none", margin: "0 0 28px", padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        {TOP_BENEFITS.map((b) => (
          <li key={b} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 14, lineHeight: 1.5, color: C.ink700 }}>
            <BenefitCheck />
            {b}
          </li>
        ))}
      </ul>

      {showReview && (
        <div className="hidden md:block" style={{ marginTop: 20, paddingTop: 20, borderTop: `1px solid ${C.lineSoft}` }}>
          <div style={{ display: "flex", gap: 2, marginBottom: 8 }}>
            {[...Array(5)].map((_, i) => <StarIcon key={i} />)}
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.55, color: C.ink700, margin: "0 0 8px", fontStyle: "italic" }}>
            „In 2 Minuten hatte ich das Ergebnis — besser als mein Excel-Sheet nach 3 Stunden."
          </p>
          <div style={{ fontSize: 12, color: C.ink500 }}>Markus K. &middot; Erstinvestor</div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12.5, color: C.ink500, paddingTop: 20, marginTop: "auto", borderTop: `1px solid ${C.lineSoft}` }}>
        <Shield className="w-3.5 h-3.5 flex-shrink-0" />
        Sichere Zahlung · SSL-verschlüsselt
      </div>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 }) {
  const steps: { n: 1 | 2 | 3; label: string }[] = [
    { n: 1, label: "Konto" },
    { n: 2, label: "Zahlung" },
    { n: 3, label: "Fertig" },
  ];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 44 }}>
      {steps.map((s, i) => {
        const active = s.n === step;
        const done = s.n < step;
        return (
          <React.Fragment key={s.n}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span
                style={{
                  width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                  background: active ? C.yellow400 : "rgba(255,255,255,.08)",
                  color: active ? C.navy950 : "rgba(255,255,255,.45)",
                  border: active ? "none" : "1px solid rgba(255,255,255,.12)",
                }}
              >
                {done ? "✓" : s.n}
              </span>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: active ? "#fff" : "rgba(255,255,255,.4)" }}>{s.label}</span>
            </div>
            {i < steps.length - 1 && <span style={{ width: 36, height: 1, background: "rgba(255,255,255,.14)" }} />}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export default function CheckoutPage() {
  const location = useLocation();
  const { isSignedIn, user } = useUser();
  const { isLoaded: signUpLoaded, signUp, setActive } = useSignUp();
  const params = new URLSearchParams(location.search);
  const interval = (params.get("interval") || "yearly") as "yearly" | "monthly";

  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (!isSignedIn) {
      sessionStorage.setItem("pending_checkout_plan", "pro");
      sessionStorage.setItem("pending_checkout_interval", interval);
    }
  }, [interval, isSignedIn]);

  useEffect(() => {
    if (isSignedIn && step === 1) setStep(2);
  }, [isSignedIn, step]);

  // --- Registrierung (eigene UI, Clerk headless über useSignUp) ------------
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agbAccepted, setAgbAccepted] = useState(true);
  const [newsletter, setNewsletter] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Zwischenschritt, falls die Clerk-Instanz E-Mail-Verifizierung verlangt --
  // signUp.create() liefert dann status "missing_requirements" statt "complete".
  const [pendingVerification, setPendingVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!signUpLoaded || !signUp || submitting || !agbAccepted) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const result = await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
        unsafeMetadata: { newsletter },
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else if (result.status === "missing_requirements") {
        await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
        setPendingVerification(true);
      } else {
        setFormError("Registrierung konnte nicht abgeschlossen werden. Bitte versuch es erneut.");
      }
    } catch (err: any) {
      const msg = err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || "Registrierung fehlgeschlagen. Bitte versuch es erneut.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  // Übersetzt Clerks rohe Fehlercodes/-texte in verständliche deutsche
  // Meldungen, statt sie 1:1 durchzureichen (z.B. "Too many failed attempts").
  function friendlyVerifyError(err: any): string {
    const first = err?.errors?.[0];
    const code = first?.code as string | undefined;
    const message = (first?.longMessage || first?.message || "") as string;
    if (code === "too_many_requests" || /too many/i.test(message)) {
      return "Zu viele Versuche – bitte fordere einen neuen Code an oder starte mit einer anderen E-Mail neu.";
    }
    if (code === "verification_expired" || /expired/i.test(message)) {
      return "Der Code ist abgelaufen. Bitte fordere einen neuen Code an.";
    }
    if (code === "form_code_incorrect" || /incorrect/i.test(message)) {
      return "Der eingegebene Code ist falsch. Bitte prüfe die Eingabe oder fordere einen neuen Code an.";
    }
    return message || "Verifizierung fehlgeschlagen. Bitte versuch es erneut.";
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!signUpLoaded || !signUp || verifying) return;
    setVerifying(true);
    setVerifyError(null);
    setResendMessage(null);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code: verificationCode.trim() });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
      } else {
        setVerifyError("Code konnte nicht bestätigt werden. Bitte prüfe die Eingabe.");
      }
    } catch (err: any) {
      setVerifyError(friendlyVerifyError(err));
    } finally {
      setVerifying(false);
    }
  }

  // Zurück zu Schritt 1 -- der User kann die E-Mail ändern oder es erneut
  // versuchen, statt bei einem gescheiterten Verifizierungscode (falsch,
  // abgelaufen, Rate-Limit) ohne Ausweg auf dem Code-Screen hängenzubleiben.
  // signUp.create() beim nächsten Absenden aktualisiert den bestehenden,
  // noch offenen Sign-up-Versuch (auch mit neuer E-Mail) -- kein separates
  // Reset der Clerk-Ressource nötig.
  function backToRegister() {
    setPendingVerification(false);
    setVerificationCode("");
    setVerifyError(null);
    setResendMessage(null);
  }

  async function handleResendCode() {
    if (!signUpLoaded || !signUp || resending) return;
    setResending(true);
    setVerifyError(null);
    setResendMessage(null);
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setResendMessage("Neuer Code wurde gesendet.");
    } catch (err: any) {
      setVerifyError(friendlyVerifyError(err));
    } finally {
      setResending(false);
    }
  }

  function goToStripe() {
    setSubmitting(true);
    const userId = user?.id || "";
    const userEmail = user?.primaryEmailAddress?.emailAddress || "";
    window.location.href = `/api/stripe/create-checkout-session?plan=pro&interval=${interval}&userId=${userId}&email=${encodeURIComponent(userEmail)}`;
  }

  const price = PLAN_PRICES[interval];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse 900px 500px at 50% -10%, rgba(61,99,255,.20), transparent 60%), radial-gradient(ellipse 700px 400px at 85% 15%, rgba(61,99,255,.10), transparent 55%), ${C.navy950}`,
        color: "#fff",
        fontFamily: FONT,
        display: "flex",
        justifyContent: "center",
        padding: "64px 20px 80px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1000, display: "flex", flexDirection: "column", alignItems: "center" }}>

        {/* Logo */}
        <a href="https://www.propora.de" style={{ marginBottom: 40, display: "flex" }}>
          <img src="/assets/propora-logo.png" alt="PROPORA" style={{ height: 30, width: "auto" }} />
        </a>

        {/* Headline */}
        <div style={{ textAlign: "center", maxWidth: 460, marginBottom: 36 }}>
          <h1 style={{ fontSize: 30, lineHeight: 1.25, fontWeight: 700, letterSpacing: "-0.01em", margin: "0 0 10px", color: "#fff" }}>
            PROPORA Pro aktivieren
          </h1>
          <p style={{ fontSize: 15.5, lineHeight: 1.55, color: "rgba(255,255,255,.62)", margin: 0 }}>
            Erstelle deinen Account und starte direkt mit deiner Immobilienanalyse.
          </p>
        </div>

        <Stepper step={step} />

        {/* Checkout-Card: eine Card, zwei Spalten, kein verschachtelter Header */}
        <div
          className="grid grid-cols-1 md:grid-cols-[0.82fr_1fr]"
          style={{ width: "100%", maxWidth: 1000, background: C.paper, borderRadius: RADIUS_CARD, boxShadow: SHADOW_CARD, overflow: "hidden" }}
        >
          <div className="order-2 md:order-1 border-t md:border-t-0 md:border-r" style={{ borderColor: C.lineSoft }}>
            <OrderSummary interval={interval} />
          </div>

          <div className="order-1 md:order-2" style={{ padding: "44px 40px", display: "flex", flexDirection: "column" }}>
            {step === 1 && !pendingVerification && (
              <>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: C.ink900, margin: "0 0 24px" }}>Konto erstellen</h2>
                <form onSubmit={handleRegister}>
                  <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 14 }}>
                    <Field id="firstname" label="Vorname" value={firstName} onChange={setFirstName} placeholder="Max" autoComplete="given-name" />
                    <Field id="lastname" label="Nachname" value={lastName} onChange={setLastName} placeholder="Mustermann" autoComplete="family-name" />
                  </div>
                  <Field id="email" label="E-Mail-Adresse" type="email" value={email} onChange={setEmail} placeholder="max@beispiel.de" autoComplete="email" />
                  <Field
                    id="password"
                    label="Passwort"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={setPassword}
                    placeholder="Mindestens 8 Zeichen"
                    autoComplete="new-password"
                    rightAdorn={
                      <button type="button" onClick={() => setShowPassword((v) => !v)} aria-label="Passwort anzeigen" style={{ background: "none", border: "none", padding: 4, cursor: "pointer", color: C.ink500, display: "flex" }}>
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />

                  {/* Von Clerk benötigt, falls Bot-Schutz (Smart CAPTCHA) aktiv ist --
                      unsichtbar, solange Clerk keinen Widget-Fallback zeigen muss. */}
                  <div id="clerk-captcha" />

                  <CheckboxRow id="terms" checked={agbAccepted} onChange={setAgbAccepted}>
                    Ich akzeptiere die{" "}
                    <a href="https://www.propora.de/agb" target="_blank" rel="noopener noreferrer" style={{ color: C.ink900, fontWeight: 600, textDecoration: "underline" }}>AGB</a>
                    {" "}und{" "}
                    <a href="https://www.propora.de/datenschutz" target="_blank" rel="noopener noreferrer" style={{ color: C.ink900, fontWeight: 600, textDecoration: "underline" }}>Datenschutzbestimmungen</a>.
                  </CheckboxRow>
                  <CheckboxRow id="newsletter" checked={newsletter} onChange={setNewsletter}>
                    Ich möchte gelegentlich Neuigkeiten zu neuen Features und Marktanalysen erhalten.
                  </CheckboxRow>

                  {formError && (
                    <p style={{ fontSize: 12.5, color: "#dc2626", margin: "0 0 12px" }}>{formError}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !agbAccepted}
                    style={{
                      width: "100%", height: 52, borderRadius: RADIUS_INPUT, border: "none",
                      background: submitting || !agbAccepted ? "rgba(244,196,48,.6)" : C.yellow400,
                      color: C.navy950, fontSize: 15, fontWeight: 700, fontFamily: FONT,
                      cursor: submitting || !agbAccepted ? "not-allowed" : "pointer",
                      marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {submitting ? "Wird erstellt…" : "Weiter zur Zahlung"}
                    {!submitting && <ArrowRight size={15} />}
                  </button>

                  <p style={{ textAlign: "center", fontSize: 12, color: C.ink500, margin: "14px 0 0" }}>
                    🔒 Sicherer Checkout · Deine Daten werden verschlüsselt übertragen
                  </p>
                </form>
              </>
            )}

            {step === 1 && pendingVerification && (
              <>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: C.ink900, margin: "0 0 8px" }}>E-Mail bestätigen</h2>
                <p style={{ fontSize: 13.5, color: C.ink500, margin: "0 0 24px" }}>
                  Wir haben einen Code an {email} geschickt.
                </p>
                <form onSubmit={handleVerify}>
                  <Field
                    id="code"
                    label="Bestätigungscode"
                    value={verificationCode}
                    onChange={setVerificationCode}
                    placeholder="123456"
                    autoComplete="one-time-code"
                  />
                  {verifyError && <p style={{ fontSize: 12.5, color: "#dc2626", margin: "0 0 12px" }}>{verifyError}</p>}
                  {resendMessage && !verifyError && (
                    <p style={{ fontSize: 12.5, color: "#16a34a", margin: "0 0 12px" }}>{resendMessage}</p>
                  )}
                  <button
                    type="submit"
                    disabled={verifying}
                    style={{
                      width: "100%", height: 52, borderRadius: RADIUS_INPUT, border: "none",
                      background: verifying ? "rgba(244,196,48,.6)" : C.yellow400,
                      color: C.navy950, fontSize: 15, fontWeight: 700, fontFamily: FONT,
                      cursor: verifying ? "not-allowed" : "pointer",
                      marginTop: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    {verifying ? "Wird geprüft…" : "Bestätigen"}
                    {!verifying && <ArrowRight size={15} />}
                  </button>

                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={backToRegister}
                      style={{ background: "none", border: "none", padding: 0, fontSize: 13, color: C.ink500, cursor: "pointer", textDecoration: "underline" }}
                    >
                      ← Zurück
                    </button>
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resending}
                      style={{ background: "none", border: "none", padding: 0, fontSize: 13, color: resending ? C.ink500 : C.blue600, cursor: resending ? "not-allowed" : "pointer", textDecoration: "underline" }}
                    >
                      {resending ? "Wird gesendet…" : "Code erneut senden"}
                    </button>
                  </div>
                </form>
              </>
            )}

            {step === 2 && (
              <>
                <h2 style={{ fontSize: 19, fontWeight: 700, color: C.ink900, margin: "0 0 8px" }}>Fast geschafft</h2>
                <p style={{ fontSize: 13.5, color: C.ink500, margin: "0 0 24px" }}>
                  Dein Account steht — weiter zur sicheren Zahlung via Stripe.
                </p>

                {user && (
                  <div style={{ marginBottom: 20, padding: 12, borderRadius: RADIUS_INPUT, fontSize: 13, background: "rgba(34,197,94,.08)", border: "1px solid rgba(34,197,94,.2)" }}>
                    <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ Account erstellt</span>
                    <span style={{ color: C.ink500, marginLeft: 8 }}>{user.primaryEmailAddress?.emailAddress}</span>
                  </div>
                )}

                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 3 }}>
                  <span style={{ fontSize: 30, fontWeight: 800, color: C.ink900, letterSpacing: "-0.02em" }}>{price.amount}</span>
                </div>
                <p style={{ fontSize: 13.5, color: C.ink500, margin: "0 0 26px" }}>{price.cadence}</p>

                <button
                  onClick={goToStripe}
                  disabled={submitting}
                  style={{
                    width: "100%", height: 52, borderRadius: RADIUS_INPUT, border: "none",
                    background: submitting ? "rgba(244,196,48,.6)" : C.yellow400,
                    color: C.navy950, fontSize: 15, fontWeight: 700, fontFamily: FONT,
                    cursor: submitting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {submitting ? "Weiterleitung…" : "Jetzt bezahlen"}
                  {!submitting && <ArrowRight size={15} />}
                </button>
                <p style={{ textAlign: "center", fontSize: 12, color: C.ink500, margin: "14px 0 0", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <Lock size={12} /> SSL-verschlüsselt · Stripe · Rechnung per E-Mail
                </p>
              </>
            )}
          </div>
        </div>

        <p style={{ marginTop: 28, fontSize: 13.5, color: "rgba(255,255,255,.55)" }}>
          Bereits registriert?{" "}
          <a href={`/login?next=${encodeURIComponent(`/checkout?plan=pro&interval=${interval}`)}`} style={{ color: C.yellow400, fontWeight: 600, textDecoration: "none" }}>
            Einloggen
          </a>
        </p>
      </div>
    </div>
  );
}
