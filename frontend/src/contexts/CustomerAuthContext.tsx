"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/api-client";
import type { CustomerProfile } from "@/lib/types";

const TOKEN_KEY = "shopplatform.customer.token";

interface AuthResponse {
  token: string;
}

interface SignupResponse {
  customerId: number;
  shopId: number;
  email: string;
  needsVerification: boolean;
  message: string;
}

interface CustomerAuthState {
  token: string | null;
  profile: CustomerProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, fullName: string) => Promise<SignupResponse>;
  verifySignup: (email: string, code: string) => Promise<void>;
  resendSignupCode: (email: string) => Promise<void>;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, newPassword: string) => Promise<void>;
  logout: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthState | null>(null);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  // Starts null on both server and first client render (matching markup,
  // avoiding a hydration mismatch) and is populated from localStorage just
  // after mount - a brief "loading" state is expected and handled by callers.
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      const stored = window.localStorage.getItem(TOKEN_KEY);
      if (!stored) {
        setLoading(false);
        return;
      }
      try {
        const p = await apiFetch<CustomerProfile>("/me", {}, stored);
        if (!cancelled) {
          setToken(stored);
          setProfile(p);
        }
      } catch {
        if (!cancelled) {
          window.localStorage.removeItem(TOKEN_KEY);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistToken = useCallback(async (t: string) => {
    window.localStorage.setItem(TOKEN_KEY, t);
    setToken(t);
    const p = await apiFetch<CustomerProfile>("/me", {}, t);
    setProfile(p);
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch<AuthResponse>("/public/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await persistToken(res.token);
    },
    [persistToken]
  );

  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    // No token is returned here - the backend requires the emailed OTP to be
    // verified first (see verifySignup) before a session can be established.
    return apiFetch<SignupResponse>("/public/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, fullName }),
    });
  }, []);

  const verifySignup = useCallback(
    async (email: string, code: string) => {
      const res = await apiFetch<AuthResponse>("/public/auth/signup/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      await persistToken(res.token);
    },
    [persistToken]
  );

  const resendSignupCode = useCallback(async (email: string) => {
    await apiFetch("/public/auth/signup/resend", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const requestOtp = useCallback(async (email: string) => {
    await apiFetch("/public/auth/login/otp/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      const res = await apiFetch<AuthResponse>("/public/auth/login/otp/verify", {
        method: "POST",
        body: JSON.stringify({ email, code }),
      });
      await persistToken(res.token);
    },
    [persistToken]
  );

  const forgotPassword = useCallback(async (email: string) => {
    await apiFetch("/public/auth/password/forgot", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }, []);

  const resetPassword = useCallback(async (resetToken: string, newPassword: string) => {
    await apiFetch("/public/auth/password/reset", {
      method: "POST",
      body: JSON.stringify({ token: resetToken, newPassword }),
    });
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      profile,
      loading,
      login,
      signup,
      verifySignup,
      resendSignupCode,
      requestOtp,
      verifyOtp,
      forgotPassword,
      resetPassword,
      logout,
    }),
    [
      token,
      profile,
      loading,
      login,
      signup,
      verifySignup,
      resendSignupCode,
      requestOtp,
      verifyOtp,
      forgotPassword,
      resetPassword,
      logout,
    ]
  );

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error("useCustomerAuth must be used within CustomerAuthProvider");
  return ctx;
}
