"use client";

import { useState } from "react";
import { useOwnerAuth } from "@/contexts/OwnerAuthContext";
import { ApiError } from "@/lib/http";

type Mode = "login" | "signup" | "forgot";

export default function OwnerLoginForm() {
  const { login, signup, forgotPassword } = useOwnerAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "signup") {
        await signup(email, password, fullName);
      } else {
        await forgotPassword(email);
        setInfo("If an account exists for that email, a reset link has been sent.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-12">
      <h1 className="mb-1 text-xl font-semibold">Shop owner portal</h1>
      <p className="mb-6 text-sm text-muted">Manage your store, catalog, orders and subscription.</p>

      {mode !== "forgot" && (
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
      {mode === "forgot" && (
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
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded-xl border border-border px-4 py-2.5 text-sm"
        />
        {mode !== "forgot" && (
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
        {error && <p className="text-sm text-red-600">{error}</p>}
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
                : "Send reset link"}
        </button>
      </form>

      {mode === "login" && (
        <button type="button" onClick={() => switchMode("forgot")} className="mt-4 block w-full text-center text-sm text-muted">
          Forgot password?
        </button>
      )}
    </div>
  );
}
