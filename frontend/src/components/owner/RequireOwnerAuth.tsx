"use client";

import { useOwnerAuth } from "@/contexts/OwnerAuthContext";
import OwnerLoginForm from "./OwnerLoginForm";

export default function RequireOwnerAuth({ children }: { children: React.ReactNode }) {
  const { token, loading } = useOwnerAuth();

  if (loading) {
    return <p className="px-4 py-12 text-center text-sm text-muted">Loading…</p>;
  }
  if (!token) {
    return <OwnerLoginForm />;
  }
  return <>{children}</>;
}
