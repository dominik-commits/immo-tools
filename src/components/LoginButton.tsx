import React from "react";
import { LogIn, LogOut, User } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function LoginButton() {
  const [email, setEmail] = React.useState<string | null>(null);
  const navigate = useNavigate();

  React.useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (email) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => navigate("/konto")}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
          title={email}
        >
          <User className="h-4 w-4" />
          Konto
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut(); location.reload(); }}
          className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => navigate("/konto")}
      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
    >
      <LogIn className="h-4 w-4" />
      Login
    </button>
  );
}
