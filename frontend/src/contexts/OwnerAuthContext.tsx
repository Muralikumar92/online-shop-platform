"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api-client";

const TOKEN_KEY = "shopplatform.owner.token";

interface AuthResponse {
  token: string;
}

export interface OwnerShop {
  id: number;
  slug: string;
  name: string;
  logoUrl: string | null;
  subscriptionStatus: string;
  subscriptionExpiresOn: string | null;
  bankDetailsConfigured: boolean;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfscCode: string | null;
  upiId: string | null;
  contactPhone: string | null;
}

interface OwnerAuthState {
  token: string | null;
  shops: OwnerShop[];
  loading: boolean;
  refreshShops: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const OwnerAuthContext = createContext<OwnerAuthState | null>(null);

export function OwnerAuthProvider({ children }: { children: ReactNode }) {
  // Starts null on both server and first client render (matching markup,
  // avoiding a hydration mismatch) and is populated from localStorage just
  // after mount - a brief "loading" state is expected and handled by callers.
  const [token, setToken] = useState<string | null>(null);
  const [shops, setShops] = useState<OwnerShop[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshShops = useCallback(async () => {
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const list = await apiFetch<OwnerShop[]>("/owner/shops", {}, stored);
      setToken(stored);
      setShops(list);
    } catch {
      window.localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Inlined rather than calling the refreshShops callback above, so this
    // one-time mount hydration reads as a self-contained effect.
    async function hydrate() {
      const stored = window.localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const list = await apiFetch<OwnerShop[]>("/owner/shops", {}, stored);
        setToken(stored);
        setShops(list);
      } catch {
        window.localStorage.removeItem(TOKEN_KEY);
      } finally {
        setLoading(false);
      }
    }
    hydrate();
  }, []);

  const persistToken = useCallback((t: string) => {
    window.localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<AuthResponse>("/auth/owner/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      persistToken(res.token);
      await refreshShops();
    },
    [persistToken, refreshShops]
  );

  const signup = useCallback(
    async (email: string, password: string, fullName: string) => {
      const res = await apiFetch<AuthResponse>("/auth/owner/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, fullName }),
      });
      persistToken(res.token);
      await refreshShops();
    },
    [persistToken, refreshShops]
  );

  const forgotPassword = useCallback(async (email: string) => {
    await apiFetch("/auth/owner/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const resetPassword = useCallback(async (resetToken: string, newPassword: string) => {
    await apiFetch("/auth/owner/password/reset", {
      method: "POST",
      body: JSON.stringify({ token: resetToken, newPassword }),
    });
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setShops([]);
  }, []);

  const value = useMemo(
    () => ({ token, shops, loading, refreshShops, login, signup, forgotPassword, resetPassword, logout }),
    [token, shops, loading, refreshShops, login, signup, forgotPassword, resetPassword, logout]
  );

  return <OwnerAuthContext.Provider value={value}>{children}</OwnerAuthContext.Provider>;
}

export function useOwnerAuth() {
  const ctx = useContext(OwnerAuthContext);
  if (!ctx) throw new Error("useOwnerAuth must be used within OwnerAuthProvider");
  return ctx;
}
