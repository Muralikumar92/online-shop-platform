"use client";

import { useState } from "react";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import { ApiError } from "@/lib/http";

type Mode = "login" | "signup" | "signup-verify" | "forgot" | "otp-request" | "otp-verify";

export default function CustomerLoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const { login, signup, verifySignup, resendSignupCode, requestOtp, verifyOtp, forgotPassword } = useCustomerAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
    setNeedsEmailVerification(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNeedsEmailVerification(false);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
        onSuccess?.();
      } else if (mode === "signup") {
        const res = await signup(email, password, fullName);
        if (res.needsVerification) {
          setInfo(res.message);
          setMode("signup-verify");
        } else {
          onSuccess?.();
        }
      } else if (mode === "signup-verify") {
        await verifySignup(email, otpCode);
        onSuccess?.();
      } else if (mode === "otp-request") {
        await requestOtp(email);
        setMode("otp-verify");
      } else if (mode === "otp-verify") {
        await verifyOtp(email, otpCode);
        onSuccess?.();
      } else if (mode === "forgot") {
        await forgotPassword(email);
        setInfo("If an account exists for that email, a reset link has been sent.");
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        if (err.status === 403 && (err.body as { emailNotVerified?: boolean } | undefined)?.emailNotVerified) {
          setNeedsEmailVerification(true);
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendFromLogin() {
    setError(null);
    setSubmitting(true);
    try {
      await resendSignupCode(email);
      setInfo("We've emailed you a new verification code.");
      setMode("signup-verify");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const showTabs = mode === "login" || mode === "signup";

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-8">
      {showTabs && (
        <div className="mb-6 flex rounded-xl bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === "login" ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold ${mode === "signup" ? "bg-surface shadow-sm" : "text-muted"}`}
          >
            Sign up
          </button>
        </div>
      )}

      {!showTabs && (
        <button type="button" onClick={() => switchMode("login")} className="mb-4 text-sm text-muted">
          ← Back to log in
        </button>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="rounded-xl border border-border px-4 py-2.5 text-sm"
          />
        )}

        {mode !== "otp-verify" && mode !== "signup-verify" && (
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl border border-border px-4 py-2.5 text-sm"
          />
        )}

        {(mode === "login" || mode === "signup") && (
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="rounded-xl border border-border px-4 py-2.5 text-sm"
          />
        )}

        {(mode === "otp-verify" || mode === "signup-verify") && (
          <input
            type="text"
            inputMode="numeric"
            placeholder="6-digit code"
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value)}
            required
            className="rounded-xl border border-border px-4 py-2.5 text-center text-lg tracking-widest"
          />
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        {needsEmailVerification && (
          <button
            type="button"
            onClick={handleResendFromLogin}
            disabled={submitting}
            className="self-start text-sm font-medium text-accent"
          >
            Resend verification code
          </button>
        )}
        {info && <p className="text-sm text-green-700">{info}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {submitting
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : mode === "signup"
                ? "Create account"
                : mode === "signup-verify"
                  ? "Verify & create account"
                  : mode === "forgot"
                    ? "Send reset link"
                    : mode === "otp-request"
                      ? "Send login code"
                      : "Verify & log in"}
        </button>
      </form>

      {mode === "login" && (
        <div className="mt-4 flex flex-col items-center gap-1.5 text-sm">
          <button type="button" onClick={() => switchMode("otp-request")} className="text-accent">
            Log in with an email code instead
          </button>
          <button type="button" onClick={() => switchMode("forgot")} className="text-muted">
            Forgot password?
          </button>
        </div>
      )}
      {(mode === "otp-verify" || mode === "signup-verify") && (
        <p className="mt-4 text-center text-sm text-muted">
          Sent to {email}.{" "}
          <button
            type="button"
            onClick={() => (mode === "signup-verify" ? resendSignupCode(email) : switchMode("otp-request"))}
            className="text-accent"
          >
            Resend
          </button>
        </p>
      )}
    </div>
  );
}
