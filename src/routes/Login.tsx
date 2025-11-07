// src/routes/Login.tsx
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthProvider";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Mail, Lock, Globe } from "lucide-react";
import { supabase as supaFallback } from "@/lib/supabaseClient";

/* ===============================================
   Konstanten
=============================================== */
const NEXT_KEY = "propora.next_after_login";
const DEFAULT_AFTER_LOGIN = "https://tools.propora.de/"; // Standardziel nach Login

/* ===============================================
   Netzwerk-Utilities (harte Timeouts, Fetch-Wrapper)
=============================================== */
function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  ms = 12000
) {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  const merged: RequestInit = { ...init, signal: ctrl.signal };
  return fetch(input, merged).finally(() => clearTimeout(id));
}

function promiseTimeout<T>(p: Promise<T>, ms = 12000, label = "Timeout"): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, rej) => setTimeout(() => rej(new Error(label)), ms)) as Promise<T>,
  ]);
}

/* ===============================================
   Typen
=============================================== */
type GoTrueTokenResp = {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
  user?: unknown;
};

/* ===============================================
   Komponente
=============================================== */
export default function Login() {
  const { supabase, session } = useAuth();
  const supa = supabase ?? supaFallback;

  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  // Debug – hilft schnell zu sehen, ob ENV/Client da sind
  useEffect(() => {
    console.log("[Login ENV]", {
      url: import.meta.env.VITE_SUPABASE_URL,
      hasAnon: !!import.meta.env.VITE_SUPABASE_ANON_KEY,
      clientReady: !!supa,
    });
  }, [supa]);

  /* -----------------------------------------------
     Redirect-Ziel (next=) sicher behandeln
  ------------------------------------------------ */
  const search = new URLSearchParams(location.search);
  const nextFromQuery = search.get("next") || "";

  // Nur relative, same-origin Pfade erlauben
  const sanitizeNext = (v: string) => {
    if (!v) return "/";
    try {
      if (v.startsWith("/")) return v;
      return "/";
    } catch {
      return "/";
    }
  };

  // next aus Query einmalig vormerken (falls vorhanden)
  useEffect(() => {
    if (nextFromQuery) {
      try {
        localStorage.setItem(NEXT_KEY, sanitizeNext(nextFromQuery));
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -----------------------------------------------
     Harte Weiterleitung (um Router/State zu umgehen)
  ------------------------------------------------ */
  function redirectAfterLogin() {
    const stored = (() => {
      try {
        return localStorage.getItem(NEXT_KEY);
      } catch {
        return null;
      }
    })();
    const target = sanitizeNext(stored || nextFromQuery || "/");
    try {
      localStorage.removeItem(NEXT_KEY);
    } catch {}
    if (target === "/") {
      window.location.assign(DEFAULT_AFTER_LOGIN);
    } else {
      window.location.assign(target);
    }
  }

  /* -----------------------------------------------
     Harte Validierung + Weiterleitung zentral
  ------------------------------------------------ */
  async function validateAndRedirect() {
    const { data: uData, error: uErr } = await supa.auth.getUser();
    if (uErr || !uData?.user) {
      await supa.auth.signOut({ scope: "local" as const });
      throw new Error("Login konnte nicht bestätigt werden. Bitte erneut versuchen.");
    }
    redirectAfterLogin();
  }

  // Wenn bereits eingeloggt → Validierung + Weiterleitung
  useEffect(() => {
    (async () => {
      if (!session) return;
      try {
        await validateAndRedirect();
      } catch (e: any) {
        setErr(e?.message || "Weiterleitung nach Login fehlgeschlagen.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  /* -----------------------------------------------
     Erreichbarkeit der Auth-API prüfen
  ------------------------------------------------ */
  async function probeAuthEndpoint(): Promise<void> {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !anon) throw new Error("Supabase-ENV fehlen (URL/ANON).");

    const endpoint = `${url.replace(/\/+$/, "")}/auth/v1/settings`;
    const res = await fetchWithTimeout(
      endpoint,
      { method: "GET", headers: { apikey: anon } },
      8000
    ).catch((e) => {
      throw new Error("Supabase nicht erreichbar: " + (e?.message || String(e)));
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(
        `Supabase antwortet mit ${res.status}.` + (t ? ` Details: ${t.slice(0, 200)}` : "")
      );
    }
  }

  /* -----------------------------------------------
     Robuster Fallback: direkter GoTrue-Call + setSession
  ------------------------------------------------ */
  async function fallbackPasswordLogin(email: string, password: string) {
    const url = import.meta.env.VITE_SUPABASE_URL!;
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY!;
    if (!url || !anon) throw new Error("Supabase-ENV fehlen (URL/ANON).");

    const endpoint = `${url.replace(/\/+$/, "")}/auth/v1/token?grant_type=password`;

    const res = await fetchWithTimeout(
      endpoint,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${anon}`,
        },
        body: JSON.stringify({ email, password }),
      },
      12000
    );

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Fallback-Login fehlgeschlagen (HTTP ${res.status}).`);
    }

    const data = (await res.json()) as GoTrueTokenResp;
    if (!supa) throw new Error("Supabase-Client nicht initialisiert.");
    if (!data?.access_token || !data?.refresh_token) {
      throw new Error("Unerwartete Antwort vom Auth-Server (Tokens fehlen).");
    }

    const { error: setErr } = await supa.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    if (setErr) throw setErr;

    // Verifizieren und *hart* redirecten
    await new Promise((r) => setTimeout(r, 100));
    const { data: uData } = await supa.auth.getUser().catch(() => ({ data: null as any }));
    if (!uData?.user) throw new Error("Session konnte nicht bestätigt werden.");

    redirectAfterLogin();
    return true;
  }

  /* -----------------------------------------------
     Passwort-Login (mit Timeout & Fallback)
  ------------------------------------------------ */
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!supa) {
      setErr(
        "Auth-Client nicht initialisiert. Bitte ENV (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) prüfen und neu deployen."
      );
      return;
    }

    setBusy(true);
    try {
      // 0) Reachability-Check für klare Fehler
      await probeAuthEndpoint();

      let usedFallback = false;

      // 1) Normales Supabase-Login – aber hart nach 12s abbrechen
      await promiseTimeout(
        supa.auth.signInWithPassword({ email: email.trim(), password: pw }),
        12000,
        "Timeout beim Passwort-Login"
      )
        .then((r: any) => {
          if (r?.error) throw r.error;
        })
        .catch(async (err) => {
          console.warn("[Login] primary failed → fallback", err);
          usedFallback = true;
          await fallbackPasswordLogin(email.trim(), pw);
          return; // Primär-Flow hier beenden
        });

      if (usedFallback) return; // bereits redirected

      // 2) Primary war erfolgreich → verifizieren + harter Redirect
      const { data: uData, error: uErr } = await supa.auth.getUser();
      if (uErr || !uData?.user) throw new Error("Login konnte nicht bestätigt werden.");
      redirectAfterLogin();
    } catch (e: any) {
      const m = String(e?.message || e);

      // Historischer „bad_json“-Bug → direkt Fallback versuchen
      if (/bad_json/i.test(m) || /Could not parse request body as JSON/i.test(m)) {
        try {
          await fallbackPasswordLogin(email.trim(), pw);
          return; // redirected
        } catch (fbErr: any) {
          setErr(fbErr?.message || "Login fehlgeschlagen (Fallback).");
          setBusy(false);
          return;
        }
      }

      setErr(m || "Login fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  /* -----------------------------------------------
     OAuth (Google) – inklusive sicherem next-Redirect
  ------------------------------------------------ */
  async function handleOAuth(provider: "google") {
    setErr(null);
    const s = supabase ?? supaFallback;
    if (!s) {
      setErr(
        "Auth-Client nicht initialisiert. Bitte ENV (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) prüfen."
      );
      return;
    }

    // next im LocalStorage parken (Backup) und im Redirect mitgeben
    const safeNext = sanitizeNext(nextFromQuery || "/");
    if (nextFromQuery) {
      try {
        localStorage.setItem(NEXT_KEY, safeNext);
      } catch {}
    }

    const redirect = `${window.location.origin}/login${
      safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""
    }`;

    try {
      await s.auth.signInWithOAuth({
        provider,
        options: { redirectTo: redirect },
      });
    } catch (e: any) {
      setErr(e?.message || "OAuth fehlgeschlagen.");
    }
  }

  /* -----------------------------------------------
     Passwort zurücksetzen
  ------------------------------------------------ */
  async function handleReset() {
    setErr(null);
    setMsg(null);
    if (!email) {
      setErr("Bitte gib zuerst deine E-Mail ein.");
      return;
    }
    if (!supa) {
      setErr("Auth-Client nicht initialisiert. Bitte ENV prüfen.");
      return;
    }
    setResetBusy(true);
    const { error } = await supa.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset`,
    });
    setResetBusy(false);
    if (error) setErr(error.message);
    else setMsg("Wir haben dir einen Link zum Zurücksetzen geschickt.");
  }

  /* -----------------------------------------------
     Render
  ------------------------------------------------ */
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#F6F8FF] via-[#F8FAFF] to-[#EEF2FF]">
      {/* Brand */}
      <div className="absolute left-6 top-6 flex items-center gap-2">
        <img src="/assets/propora-logo.png" alt="PROPORA" className="h-6 w-auto" />
      </div>

      {/* Deko */}
      <div className="pointer-events-none absolute -left-40 top-48 h-80 w-80 rounded-full bg-[#0F2C8A]/10 blur-3xl" />
      <div className="pointer-events-none absolute -right-40 bottom-24 h-80 w-80 rounded-full bg-indigo-300/20 blur-3xl" />

      {/* Card */}
      <main className="relative z-10 mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-xl backdrop-blur-sm md:p-8">
          <h1 className="mb-6 text-center text-2xl font-extrabold tracking-tight text-gray-900">
            Willkommen zurück
          </h1>

          {/* Google */}
          <button
            onClick={() => handleOAuth("google")}
            className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Globe className="h-4 w-4" />
            Weiter mit Google
          </button>

          <div className="mb-4 flex items-center gap-3">
            <div className="h-px grow bg-gray-200" />
            <span className="text-xs text-gray-500">oder</span>
            <div className="h-px grow bg-gray-200" />
          </div>

          {nextFromQuery && (
            <p className="mb-3 rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-900">
              Nach dem Login wirst du weitergeleitet zu{" "}
              <span className="font-medium">{sanitizeNext(nextFromQuery)}</span>.
            </p>
          )}
          {err && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{err}</p>
          )}
          {msg && (
            <p className="mb-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {msg}
            </p>
          )}

          <form onSubmit={handleLogin} className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              E-Mail
              <div className="mt-1 flex items-center rounded-xl border border-gray-300 bg-white px-3">
                <Mail className="mr-2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full border-0 p-0 text-sm outline-none focus:ring-0"
                  placeholder="name@beispiel.de"
                  autoComplete="email"
                />
              </div>
            </label>

            <label className="block text-sm font-medium text-gray-700">
              Passwort
              <div className="mt-1 flex items-center rounded-xl border border-gray-300 bg-white px-3">
                <Lock className="mr-2 h-4 w-4 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={8}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className="h-10 w-full border-0 p-0 text-sm outline-none focus:ring-0"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-[#0F2C8A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:opacity-60"
            >
              {busy ? "Bitte warten…" : "Anmelden"}
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between text-sm">
            <button
              onClick={handleReset}
              disabled={resetBusy}
              className="text-[#0F2C8A] hover:underline disabled:opacity-50"
            >
              Passwort vergessen?
            </button>
            <Link
              to="/preise"
              onClick={() => {
                if (nextFromQuery) {
                  try {
                    localStorage.setItem(NEXT_KEY, sanitizeNext(nextFromQuery));
                  } catch {}
                }
              }}
              className="text-gray-700 hover:underline"
            >
              Noch keinen Zugang?
            </Link>
          </div>

          {/* Optionaler Ping */}
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() =>
                supa
                  ?.auth.getSession()
                  .then((r: unknown) => console.log("[Ping] session", r))
                  .catch(console.error)
              }
              className="text-xs text-gray-500 hover:underline"
            >
              Supabase-Ping
            </button>
          </div>
        </div>
      </main>

      <div className="absolute bottom-6 left-0 right-0 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} PROPORA
      </div>
    </div>
  );
}
