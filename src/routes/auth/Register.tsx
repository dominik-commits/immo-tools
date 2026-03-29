// src/routes/auth/Register.tsx
import React from "react";
import { SignUp } from "@clerk/clerk-react";
import { useLocation } from "react-router-dom";

const Register: React.FC = () => {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const next = params.get("next") || "/";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <SignUp redirectUrl={next} />
    </div>
  );
};

export default Register;
