import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthProvider";
import { Link } from "react-router-dom";
import LoginDialog from "@/components/LoginDialog";

export default function NavAuth() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (user) {
    return (
      <Link
        to="/konto"
        className="rounded-md bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
      >
        Konto
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Login
      </button>
      <LoginDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
