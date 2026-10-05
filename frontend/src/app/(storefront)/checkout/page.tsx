"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http";
import { formatPaise, type GuestCheckoutResponse, type ShippingAddress } from "@/lib/types";

const EMPTY_ADDRESS: ShippingAddress = {
  fullName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  pincode: "",
};

/**
 * Lets the customer share the order (and tracking link) straight to the
 * shop owner's WhatsApp/Instagram via the native share sheet where
 * supported, falling back to a direct WhatsApp web link and copy buttons.
 */
function ShareOrderScreen({ result, onDone }: { result: GuestCheckoutResponse; onDone: () => void }) {
  const [copied, setCopied] = useState<"message" | "link" | null>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function handleShare() {
    try {
      await navigator.share({ text: result.shareMessage, url: result.trackingUrl });
    } catch {
      // user cancelled the share sheet - nothing to do
    }
  }

  function handleCopy(kind: "message" | "link") {
    const text = kind === "message" ? result.shareMessage : result.trackingUrl;
    navigator.clipboard?.writeText(text).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(result.shareMessage)}`;

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-lg font-semibold">Order requested — now share it with the shop</h1>
      <p className="text-sm text-muted">
        Your order #{result.orderId} ({formatPaise(result.totalInPaise)}) has been recorded, but{" "}
        <strong>nothing is confirmed or reserved yet</strong>. Send the message below to the shop owner on WhatsApp or
        Instagram DM — they&apos;ll reserve your items and tell you how to pay once they hear from you.
      </p>

      <pre className="whitespace-pre-wrap rounded-2xl border border-border bg-surface p-4 text-sm">{result.shareMessage}</pre>

      <div className="flex flex-col gap-2">
        {canShare && (
          <button type="button" onClick={handleShare} className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground">
            Share order…
          </button>
        )}
        <a
          href={whatsappHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-border py-3 text-center text-sm font-semibold"
        >
          Open in WhatsApp
        </a>
        <button type="button" onClick={() => handleCopy("message")} className="text-sm text-muted underline">
          {copied === "message" ? "Copied!" : "Copy message"}
        </button>
      </div>

      <div className="mt-2 flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
        <p className="text-sm font-medium">Track this order anytime</p>
        <p className="break-all text-xs text-muted">{result.trackingUrl}</p>
        <button type="button" onClick={() => handleCopy("link")} className="text-left text-sm text-accent underline">
          {copied === "link" ? "Copied!" : "Copy tracking link"}
        </button>
      </div>

      <button type="button" onClick={onDone} className="rounded-xl border border-border py-3 text-sm font-semibold">
        View order status
      </button>
    </div>
  );
}

export default function CheckoutPage() {
  const { lines, subtotalInPaise, clear } = useCart();
  const router = useRouter();

  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<GuestCheckoutResponse | null>(null);

  function update<K extends keyof ShippingAddress>(key: K, value: ShippingAddress[K]) {
    setAddress((a) => ({ ...a, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiFetch<GuestCheckoutResponse>("/public/guest/checkout", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
          couponCode: couponCode.trim() || null,
          shippingAddress: address,
        }),
      });
      clear();
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not place your order request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return <ShareOrderScreen result={result} onDone={() => router.push(`/orders/track/${result.trackingToken}`)} />;
  }

  if (lines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 text-lg font-semibold">Checkout</h1>

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
        <span className="text-sm text-muted">Order total</span>
        <span className="text-lg font-semibold">{formatPaise(subtotalInPaise)}</span>
      </div>

      <p className="mb-4 rounded-2xl border border-border bg-surface p-4 text-sm text-muted">
        No account needed. Fill in your delivery details below, then you&apos;ll get a message to share with the shop owner on
        WhatsApp/Instagram — they&apos;ll confirm your order and send payment details directly.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Full name"
          value={address.fullName}
          onChange={(e) => update("fullName", e.target.value)}
          required
          className="rounded-xl border border-border px-4 py-2.5 text-sm"
        />
        <input
          type="tel"
          placeholder="Phone number (so the shop can reach you)"
          value={address.phone}
          onChange={(e) => update("phone", e.target.value)}
          required
          className="rounded-xl border border-border px-4 py-2.5 text-sm"
        />
        <input
          type="text"
          placeholder="Address line 1"
          value={address.addressLine1}
          onChange={(e) => update("addressLine1", e.target.value)}
          required
          className="rounded-xl border border-border px-4 py-2.5 text-sm"
        />
        <input
          type="text"
          placeholder="Address line 2 (optional)"
          value={address.addressLine2 ?? ""}
          onChange={(e) => update("addressLine2", e.target.value)}
          className="rounded-xl border border-border px-4 py-2.5 text-sm"
        />
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="City"
            value={address.city}
            onChange={(e) => update("city", e.target.value)}
            required
            className="w-1/2 rounded-xl border border-border px-4 py-2.5 text-sm"
          />
          <input
            type="text"
            placeholder="State"
            value={address.state}
            onChange={(e) => update("state", e.target.value)}
            required
            className="w-1/2 rounded-xl border border-border px-4 py-2.5 text-sm"
          />
        </div>
        <input
          type="text"
          placeholder="Pincode"
          value={address.pincode}
          onChange={(e) => update("pincode", e.target.value)}
          required
          className="rounded-xl border border-border px-4 py-2.5 text-sm"
        />
        <input
          type="text"
          placeholder="Coupon code (optional)"
          value={couponCode}
          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
          className="rounded-xl border border-border px-4 py-2.5 text-sm"
        />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Review order to share"}
        </button>
      </form>
    </div>
  );
}
