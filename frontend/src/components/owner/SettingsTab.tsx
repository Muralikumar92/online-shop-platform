"use client";

import { useEffect, useState, useCallback } from "react";
import { useOwnerAuth, type OwnerShop } from "@/contexts/OwnerAuthContext";
import { apiFetch, apiUpload, ApiError } from "@/lib/api-client";
import type { SubscriptionPlan, InitiateSubscriptionResponse } from "@/lib/types";
import { formatPaise } from "@/lib/types";
import { loadRazorpayScript } from "@/lib/razorpay";

function LogoUpload({ shop, onUpdated }: { shop: OwnerShop; onUpdated: () => void }) {
  const { token } = useOwnerAuth();
  const [uploading, setUploading] = useState(false);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      await apiUpload(`/owner/shops/${shop.id}/logo`, formData, token);
      onUpdated();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4">
      {shop.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- arbitrary S3/CloudFront URL
        <img src={shop.logoUrl} alt={shop.name} className="h-16 w-16 rounded-full object-cover" />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent text-xl font-semibold text-accent-foreground">
          {shop.name.charAt(0).toUpperCase()}
        </div>
      )}
      <div>
        <p className="font-medium">{shop.name}</p>
        <p className="text-sm text-muted">{shop.slug}.myshops.com</p>
        <label className="mt-2 inline-block cursor-pointer text-sm text-accent">
          {uploading ? "Uploading…" : "Change logo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>
      </div>
    </div>
  );
}

function UpiDetailsForm({ shop }: { shop: OwnerShop }) {
  const { token } = useOwnerAuth();
  const [upiId, setUpiId] = useState(shop.upiId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await apiFetch(`/owner/shops/${shop.id}/upi-details`, { method: "PUT", body: JSON.stringify({ upiId }) }, token);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save UPI ID.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-semibold">UPI ID (recommended for manual payments)</h2>
      <p className="text-xs text-muted">
        Your UPI ID or GPay-linked phone number (e.g. <code>you@okaxis</code> or <code>9876543210@upi</code>). This is
        all customers need to pay you directly - bank account details below are optional.
      </p>
      <input
        type="text"
        placeholder="yourname@bank or phone@upi"
        value={upiId}
        onChange={(e) => setUpiId(e.target.value)}
        required
        className="rounded-xl border border-border px-4 py-2.5 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">UPI ID saved.</p>}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save UPI ID"}
      </button>
    </form>
  );
}

function BankDetailsForm({ shop }: { shop: OwnerShop }) {
  const { token } = useOwnerAuth();
  const [accountHolderName, setAccountHolderName] = useState(shop.bankAccountName ?? "");
  const [accountNumber, setAccountNumber] = useState(shop.bankAccountNumber ?? "");
  const [ifscCode, setIfscCode] = useState(shop.bankIfscCode ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await apiFetch(
        `/owner/shops/${shop.id}/bank-details`,
        { method: "PUT", body: JSON.stringify({ accountHolderName, accountNumber, ifscCode }) },
        token
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save bank details.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-semibold">Bank details (optional)</h2>
      <p className="text-xs text-muted">
        Used for future payouts, and shown as a fallback to customers paying manually if you haven&apos;t set a UPI ID
        above.
      </p>
      <input
        type="text"
        placeholder="Account holder name"
        value={accountHolderName}
        onChange={(e) => setAccountHolderName(e.target.value)}
        required
        className="rounded-xl border border-border px-4 py-2.5 text-sm"
      />
      <input
        type="text"
        placeholder="Account number"
        value={accountNumber}
        onChange={(e) => setAccountNumber(e.target.value)}
        required
        className="rounded-xl border border-border px-4 py-2.5 text-sm"
      />
      <input
        type="text"
        placeholder="IFSC code"
        value={ifscCode}
        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
        required
        className="rounded-xl border border-border px-4 py-2.5 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">Bank details saved.</p>}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save bank details"}
      </button>
    </form>
  );
}

function ContactDetailsForm({ shop }: { shop: OwnerShop }) {
  const { token } = useOwnerAuth();
  const [contactPhone, setContactPhone] = useState(shop.contactPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);
    try {
      await apiFetch(
        `/owner/shops/${shop.id}/contact-details`,
        { method: "PUT", body: JSON.stringify({ contactPhone }) },
        token
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save contact phone.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-semibold">Contact phone</h2>
      <p className="text-xs text-muted">
        Shown to customers who choose to pay you directly, so they can confirm payment with you.
      </p>
      <input
        type="tel"
        placeholder="Contact phone (e.g. +91 98765 43210)"
        value={contactPhone}
        onChange={(e) => setContactPhone(e.target.value)}
        required
        className="rounded-xl border border-border px-4 py-2.5 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-700">Contact phone saved.</p>}
      <button
        type="submit"
        disabled={submitting}
        className="self-start rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
      >
        {submitting ? "Saving…" : "Save contact phone"}
      </button>
    </form>
  );
}

function SubscriptionSection({ shop, onUpdated }: { shop: OwnerShop; onUpdated: () => void }) {
  const { token } = useOwnerAuth();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [payingPlanId, setPayingPlanId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<SubscriptionPlan[]>("/public/subscription-plans").then(setPlans).catch(() => setPlans([]));
  }, []);

  async function handleSubscribe(planId: number) {
    setError(null);
    setPayingPlanId(planId);
    try {
      const initiateRes = await apiFetch<InitiateSubscriptionResponse>(
        `/owner/shops/${shop.id}/subscription/initiate`,
        { method: "POST", body: JSON.stringify({ planId }) },
        token
      );
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        setError("Could not load the payment gateway. Please try again.");
        return;
      }
      const razorpay = new window.Razorpay({
        key: initiateRes.razorpayKeyId,
        amount: initiateRes.amountInPaise,
        currency: initiateRes.currency,
        name: shop.name,
        description: "Shop subscription",
        order_id: initiateRes.razorpayOrderId,
        handler: async (response) => {
          try {
            await apiFetch(
              `/owner/shops/${shop.id}/subscription/confirm`,
              {
                method: "POST",
                body: JSON.stringify({
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              },
              token
            );
            onUpdated();
          } catch {
            setError("Payment received but confirmation failed. Please contact support.");
          }
        },
        modal: { ondismiss: () => setPayingPlanId(null) },
        theme: { color: "#c2673d" },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start checkout. Please try again.");
    } finally {
      setPayingPlanId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <h2 className="font-semibold">Subscription</h2>
      <p className="text-sm text-muted">
        Status: <span className="font-medium">{shop.subscriptionStatus}</span>
        {shop.subscriptionExpiresOn && ` · Valid until ${shop.subscriptionExpiresOn}`}
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {plans.map((plan) => (
          <div key={plan.id} className="flex flex-col gap-2 rounded-xl border border-border p-3">
            <p className="font-medium">{plan.name}</p>
            <p className="text-sm text-muted">
              {formatPaise(plan.priceInPaise)} / {plan.durationDays} days
            </p>
            <button
              type="button"
              onClick={() => handleSubscribe(plan.id)}
              disabled={payingPlanId === plan.id}
              className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-60"
            >
              {payingPlanId === plan.id ? "Processing…" : "Subscribe"}
            </button>
          </div>
        ))}
        {plans.length === 0 && <p className="text-sm text-muted">No plans available.</p>}
      </div>
    </div>
  );
}

export default function SettingsTab({ shopId }: { shopId: number }) {
  const { shops, refreshShops } = useOwnerAuth();
  const shop = shops.find((s) => s.id === shopId);
  const refresh = useCallback(() => refreshShops(), [refreshShops]);

  if (!shop) return <p className="text-sm text-muted">Loading…</p>;

  return (
    <div className="flex flex-col gap-6">
      <LogoUpload shop={shop} onUpdated={refresh} />
      <ContactDetailsForm shop={shop} />
      <UpiDetailsForm shop={shop} />
      <BankDetailsForm shop={shop} />
      <SubscriptionSection shop={shop} onUpdated={refresh} />
    </div>
  );
}
