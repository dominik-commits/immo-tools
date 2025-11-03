import { useEffect } from "react";
import { useAuth } from "../contexts/AuthProvider";

/**
 * Öffnet automatisch den Login-Dialog, wenn "?login=true" in der URL steht.
 * Kann von der Landingpage (z.B. propora.de) genutzt werden:
 * https://tools.propora.de/?login=true
 */
export default function useAutoLogin(openLoginDialog: () => void) {
  const { session, loading } = useAuth();

  useEffect(() => {
    // Warten, bis Auth-Status bekannt ist
    if (loading) return;

    const params = new URLSearchParams(window.location.search);
    const shouldLogin = params.get("login") === "true";

    // Nur ausführen, wenn User NICHT eingeloggt ist
    if (shouldLogin && !session) {
      openLoginDialog();
    }

    // URL wieder „aufräumen“, damit sie sauber bleibt
    if (shouldLogin) {
      const clean = window.location.origin + window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, [loading, session, openLoginDialog]);
}
