// src/routes/Checkout.tsx
import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUser } from "@clerk/clerk-react";

const Checkout: React.FC = () => {
  const { user, isLoaded, isSignedIn } = useUser();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoaded) return;

    const searchParams = new URLSearchParams(location.search);
    const plan = (searchParams.get("plan") || "basis") as "basis" | "pro";
    const interval = (searchParams.get("interval") || "yearly") as "yearly" | "monthly";

    if (!isSignedIn || !user) {
      const next = `${location.pathname}${location.search}`;
      navigate(`/register?next=${encodeURIComponent(next)}`, { replace: true });
      return;
    }

    const email = user.primaryEmailAddress?.emailAddress || undefined;

    const url = new URL("/api/stripe/create-checkout-session", window.location.origin);
    url.searchParams.set("plan", plan);
    url.searchParams.set("interval", interval);
    url.searchParams.set("userId", user.id);
    if (email) url.searchParams.set("email", email);

    // Browser → API → 303 → Stripe
    window.location.href = url.toString();
  }, [isLoaded, isSignedIn, user, location.pathname, location.search, navigate]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="rounded-2xl border bg-white px-6 py-8 text-center shadow-sm">
        <p className="text-sm text-gray-600">
          Du wirst zu unserem Zahlungsanbieter weitergeleitet&hellip;
        </p>
      </div>
    </div>
  );
};

export default Checkout;
