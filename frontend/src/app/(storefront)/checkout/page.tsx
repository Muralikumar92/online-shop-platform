"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import RequireCustomerAuth from "@/components/RequireCustomerAuth";
import AddressSelector from "@/components/AddressSelector";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http";
import {
  formatPaise,
  type CheckoutInitiateResponse,
  type CustomerAddress,
  type PaymentMethod,
  type ShippingAddress,
} from "@/lib/types";
import { loadRazorpayScript } from "@/lib/razorpay";
import ManualPaymentInfo from "@/components/ManualPaymentInfo";
import Link from "next/link";

function toShippingAddress(addr: CustomerAddress): ShippingAddress {
  return {
    fullName: addr.fullName,
    phone: addr.phone,
    addressLine1: addr.addressLine1,
    addressLine2: addr.addressLine2 ?? "",
    city: addr.city,
    state: addr.state,
    pincode: addr.pincode,
  };
}

function ManualPaymentStep({ initiateRes, onDone }: { initiateRes: CheckoutInitiateResponse; onDone: () => void }) {
  const { token } = useCustomerAuth();
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const instructions = initiateRes.manualPaymentInstructions;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(
        "/me/checkout/submit-payment",
        { method: "POST", body: JSON.stringify({ orderId: initiateRes.orderId, paymentReference: reference }) },
        token
      );
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit payment reference. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-lg font-semibold">Pay the shop owner directly</h1>
      {instructions && <ManualPaymentInfo instructions={instructions} amountInPaise={initiateRes.amountInPaise} />}
      <p className="text-sm text-muted">
        Your order #{initiateRes.orderId} is reserved. Once you&apos;ve paid, enter the UPI/bank reference (or any note)
        below so the owner can match your payment to your order.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Payment reference / UTR / note"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          required
          className="rounded-xl border border-border px-4 py-2.5 text-sm"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "I've paid - submit reference"}
        </button>
        <button type="button" onClick={onDone} className="text-sm text-muted underline">
          I&apos;ll do this later - view my order
        </button>
      </form>
    </div>
  );
}

type Step = "address" | "payment";

function CheckoutForm() {
  const { lines, subtotalInPaise, clear } = useCart();
  const { token } = useCustomerAuth();
  const router = useRouter();

  const [step, setStep] = useState<Step>("address");
  const [addresses, setAddresses] = useState<CustomerAddress[] | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);

  const [couponCode, setCouponCode] = useState("");
  // Only manual payment (pay the shop owner directly) is available until an online
  // payment gateway is integrated, so this isn't user-selectable right now.
  const paymentMethod: PaymentMethod = "MANUAL";
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [manualStep, setManualStep] = useState<CheckoutInitiateResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<CustomerAddress[]>("/me/addresses", {}, token)
      .then((data) => {
        if (cancelled) return;
        setAddresses(data);
        const def = data.find((a) => a.isDefault) ?? data[0];
        if (def) setSelectedAddressId(def.id);
      })
      .catch(() => {
        if (!cancelled) setAddressError("Could not load your saved addresses.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    const selected = addresses?.find((a) => a.id === selectedAddressId);
    if (!selected) {
      setStep("address");
      return;
    }
    const address = toShippingAddress(selected);
    setError(null);
    setSubmitting(true);
    try {
      const initiateRes = await apiFetch<CheckoutInitiateResponse>(
        "/me/checkout/initiate",
        {
          method: "POST",
          body: JSON.stringify({
            items: lines.map((l) => ({ itemId: l.itemId, quantity: l.quantity })),
            couponCode: couponCode.trim() || null,
            shippingAddress: address,
            paymentMethod,
          }),
        },
        token
      );

      if (initiateRes.paymentMethod === "MANUAL") {
        clear();
        setManualStep(initiateRes);
        setSubmitting(false);
        return;
      }

      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay) {
        setError("Could not load the payment widget. Please check your connection and try again.");
        setSubmitting(false);
        return;
      }

      if (!initiateRes.razorpayKeyId || !initiateRes.razorpayOrderId) {
        setError("Payment gateway details were missing. Please try again.");
        setSubmitting(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: initiateRes.razorpayKeyId,
        amount: initiateRes.amountInPaise,
        currency: "INR",
        name: "Checkout",
        description: `Order #${initiateRes.orderId}`,
        order_id: initiateRes.razorpayOrderId,
        prefill: { name: address.fullName, contact: address.phone },
        theme: { color: "#c2673d" },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            setError("Payment was cancelled. You can try again.");
          },
        },
        handler: async (response) => {
          try {
            await apiFetch(
              "/me/checkout/confirm",
              {
                method: "POST",
                body: JSON.stringify({
                  orderId: initiateRes.orderId,
                  razorpayOrderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  razorpaySignature: response.razorpay_signature,
                }),
              },
              token
            );
            clear();
            router.push(`/orders/${initiateRes.orderId}`);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : "Payment confirmation failed. Contact support if you were charged.");
            setSubmitting(false);
          }
        },
      });
      razorpay.open();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not start checkout. Please try again.");
      setSubmitting(false);
    }
  }

  if (manualStep) {
    return <ManualPaymentStep initiateRes={manualStep} onDone={() => router.push(`/orders/${manualStep.orderId}`)} />;
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

  const selectedAddress = addresses?.find((a) => a.id === selectedAddressId) ?? null;

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
        <span className={step === "address" ? "text-accent" : ""}>1. Address</span>
        <span>→</span>
        <span className={step === "payment" ? "text-accent" : ""}>2. Payment</span>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-2xl border border-border bg-surface p-4">
        <span className="text-sm text-muted">Order total</span>
        <span className="text-lg font-semibold">{formatPaise(subtotalInPaise)}</span>
      </div>

      {step === "address" && (
        <div className="flex flex-col gap-4">
          <h1 className="text-lg font-semibold">Deliver to</h1>
          {addressError && <p className="text-sm text-red-600">{addressError}</p>}
          {addresses === null ? (
            <p className="text-sm text-muted">Loading your addresses…</p>
          ) : (
            <AddressSelector
              token={token}
              addresses={addresses}
              selectedId={selectedAddressId}
              onSelect={setSelectedAddressId}
              onAddressesChange={setAddresses}
            />
          )}
          <button
            type="button"
            disabled={!selectedAddressId}
            onClick={() => setStep("payment")}
            className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          >
            Continue to payment
          </button>
        </div>
      )}

      {step === "payment" && selectedAddress && (
        <form onSubmit={handlePaymentSubmit} className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-sm">
            <div>
              <p className="font-medium">{selectedAddress.fullName}</p>
              <p className="text-muted">
                {selectedAddress.addressLine1}, {selectedAddress.city}, {selectedAddress.state} {selectedAddress.pincode}
              </p>
            </div>
            <button type="button" onClick={() => setStep("address")} className="text-sm font-medium text-accent">
              Change
            </button>
          </div>

          <input
            type="text"
            placeholder="Coupon code (optional)"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            className="rounded-xl border border-border px-4 py-2.5 text-sm"
          />

          <div className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
            <span>🤝</span>
            <span>
              <span className="font-medium">Pay the shop owner directly</span> — bank transfer, UPI, or cash on delivery.
            </span>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground disabled:opacity-60"
          >
            {submitting ? "Processing…" : "Reserve order & get payment details"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <RequireCustomerAuth>
      <CheckoutForm />
    </RequireCustomerAuth>
  );
}
