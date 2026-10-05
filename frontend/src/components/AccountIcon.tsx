"use client";

import Link from "next/link";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";

/** Shortens "Jane Doe" -> "Jane" for compact spaces like the bottom nav. */
export function useAccountDisplayName(): string | null {
  const { token, profile } = useCustomerAuth();
  if (!token) return null;
  const name = profile?.fullName?.trim();
  if (name) return name.split(" ")[0];
  return profile?.email?.split("@")[0] ?? null;
}

/**
 * Avatar that visually communicates login state without relying on generic
 * login/logout text:
 * - Logged in: solid accent circle with the customer's initial - the initial
 *   itself (plus the display name shown alongside it) signals the signed-in state.
 * - Logged out: plain outline person icon.
 */
export default function AccountIcon({ className = "" }: { className?: string }) {
  const { token, profile } = useCustomerAuth();
  const loggedIn = Boolean(token);
  const initial = (profile?.fullName?.trim()?.charAt(0) || profile?.email?.charAt(0) || "").toUpperCase();

  return (
    <span className={`relative inline-flex h-6 w-6 shrink-0 items-center justify-center ${className}`}>
      {loggedIn ? (
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
          {initial || (
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-accent-foreground" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4.418 3.582-7 8-7s8 2.582 8 7v1H4v-1Z" />
            </svg>
          )}
        </span>
      ) : (
        <svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current stroke-[1.6]" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20c0-4.418 3.582-7 8-7s8 2.582 8 7v1H4v-1Z" />
        </svg>
      )}
    </span>
  );
}

/** Desktop nav "Account" link: shows the icon plus the customer's first name once logged in, falling back to the generic label when logged out. */
export function AccountNavLink({ label }: { label: string }) {
  const displayName = useAccountDisplayName();
  return (
    <Link href="/account" className="flex items-center gap-1.5 hover:text-foreground">
      <AccountIcon />
      <span className="max-w-[120px] truncate">{displayName ?? label}</span>
    </Link>
  );
}
