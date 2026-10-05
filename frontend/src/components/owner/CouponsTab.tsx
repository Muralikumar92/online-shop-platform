"use client";

import { useEffect, useState, useCallback } from "react";
import { useOwnerAuth } from "@/contexts/OwnerAuthContext";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { CouponResponse } from "@/lib/types";

const emptyForm = { code: "", discountType: "PERCENTAGE", discountValue: "", minOrderAmount: "0", maxUses: "" };

export default function CouponsTab({ shopId }: { shopId: number }) {
  const { token } = useOwnerAuth();
  const [coupons, setCoupons] = useState<CouponResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      setCoupons(await apiFetch<CouponResponse[]>(`/owner/shops/${shopId}/coupons`, {}, token));
    } finally {
      setLoading(false);
    }
  }, [shopId, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(
        `/owner/shops/${shopId}/coupons`,
        {
          method: "POST",
          body: JSON.stringify({
            code: form.code.toUpperCase(),
            discountType: form.discountType,
            discountValue: form.discountType === "PERCENTAGE" ? Number(form.discountValue) : Math.round(Number(form.discountValue) * 100),
            minOrderAmount: Math.round(Number(form.minOrderAmount) * 100),
            maxUses: form.maxUses ? Number(form.maxUses) : null,
          }),
        },
        token
      );
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create coupon.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this coupon?")) return;
    await apiFetch(`/owner/shops/${shopId}/coupons/${id}`, { method: "DELETE" }, token);
    await load();
  }

  if (loading) return <p className="text-sm text-muted">Loading coupons…</p>;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={handleCreate} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-semibold">New coupon</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input
            type="text"
            placeholder="CODE"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
            required
            className="rounded-xl border border-border px-4 py-2.5 text-sm uppercase"
          />
          <select
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
            className="rounded-xl border border-border px-4 py-2.5 text-sm"
          >
            <option value="PERCENTAGE">% off</option>
            <option value="FLAT">Flat ₹ off</option>
          </select>
          <input
            type="number"
            min="0"
            placeholder={form.discountType === "PERCENTAGE" ? "e.g. 10" : "₹ amount"}
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
            required
            className="rounded-xl border border-border px-4 py-2.5 text-sm"
          />
          <input
            type="number"
            min="0"
            placeholder="Min order ₹"
            value={form.minOrderAmount}
            onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
            className="rounded-xl border border-border px-4 py-2.5 text-sm"
          />
        </div>
        <input
          type="number"
          min="1"
          placeholder="Max uses (optional)"
          value={form.maxUses}
          onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
          className="w-40 rounded-xl border border-border px-4 py-2.5 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {submitting ? "Creating…" : "Create coupon"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        {coupons.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 text-sm">
            <div>
              <p className="font-semibold">{c.code}</p>
              <p className="text-muted">
                {c.discountType === "PERCENTAGE" ? `${c.discountValue}% off` : `₹${c.discountValue / 100} off`} · Used {c.usedCount}
                {c.maxUses ? `/${c.maxUses}` : ""} · {c.currentlyValid ? "Active" : "Inactive"}
              </p>
            </div>
            <button type="button" onClick={() => handleDelete(c.id)} className="text-red-600">
              Delete
            </button>
          </div>
        ))}
        {coupons.length === 0 && <p className="text-sm text-muted">No coupons yet.</p>}
      </div>
    </div>
  );
}
