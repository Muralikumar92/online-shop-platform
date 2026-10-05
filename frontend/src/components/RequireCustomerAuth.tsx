"use client";

import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import CustomerLoginForm from "./CustomerLoginForm";

export default function RequireCustomerAuth({ children }: { children: React.ReactNode }) {
  const { token, loading } = useCustomerAuth();

  if (loading) {
    return <div className="flex h-full items-center justify-center py-16 text-muted">Loading…</div>;
  }

  if (!token) {
    return (
      <div>
        <p className="px-4 pt-6 text-center text-sm text-muted">Log in to continue</p>
        <CustomerLoginForm />
      </div>
    );
  }

  return <>{children}</>;
}
