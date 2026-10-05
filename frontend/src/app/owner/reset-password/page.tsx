"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useOwnerAuth } from "@/contexts/OwnerAuthContext";
import { ApiError } from "@/lib/http";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const { resetPassword } = useOwnerAuth();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push("/owner"), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reset password. The link may have expired.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return <p className="px-4 py-8 text-center text-sm text-red-600">This reset link is invalid or missing a token.</p>;
  }
  if (done) {
    return <p className="px-4 py-8 text-center text-sm text-green-700">Password updated! Redirecting to log in…</p>;
  }

  return (
    <div className="mx-auto w-full max-w-sm px-4 py-8">
      <h1 className="mb-4 text-lg font-semibold">Reset your password</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="rounded-xl border border-border px-4 py-2.5 text-sm"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className="rounded-xl border border-border px-4 py-2.5 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {submitting ? "Please wait…" : "Reset password"}
        </button>
      </form>
    </div>
  );
}

export default function OwnerResetPasswordPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-center text-muted">Loading…</p>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
