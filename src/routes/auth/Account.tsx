import React from "react";
import { UserProfile, SignedIn, SignedOut } from "@clerk/clerk-react";

export default function Account() {
  return (
    <div className="mx-auto max-w-3xl p-6">
      <SignedIn>
        <UserProfile
          appearance={{ variables: { colorPrimary: "#0F2C8A" } }}
          // Tabs Password, Email, MFA, Sessions etc. sind enthalten
        />
      </SignedIn>

      <SignedOut>
        <p className="text-sm text-gray-600">
          Bitte zuerst <a className="underline" href="/login">anmelden</a>.
        </p>
      </SignedOut>
    </div>
  );
}
