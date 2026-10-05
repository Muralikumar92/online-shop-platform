"use client";

import Link from "next/link";
import { useOwnerAuth } from "@/contexts/OwnerAuthContext";

export default function OwnerHeader() {
  const { token, logout } = useOwnerAuth();
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
      <div className="content-container flex items-center gap-3 px-4 py-3 sm:px-6">
        <Link href="/owner" className="flex-1 text-lg font-semibold">
          🏪 Owner Portal
        </Link>
        {token && (
          <button type="button" onClick={logout} className="text-sm font-medium text-muted hover:text-foreground">
            Log out
          </button>
        )}
      </div>
    </header>
  );
}
