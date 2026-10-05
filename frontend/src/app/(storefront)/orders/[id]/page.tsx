"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import RequireCustomerAuth from "@/components/RequireCustomerAuth";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import ManualPaymentInfo from "@/components/ManualPaymentInfo";
import { apiFetch } from "@/lib/api-client";
import { ApiError } from "@/lib/http";
import { formatPaise, type OrderResponse, type OrderStatus } from "@/lib/types";

const TRACKING_STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PAID", label: "Order confirmed" },
  { status: "PACKED", label: "Packed" },
  { status: "DISPATCHED", label: "Dispatched" },
  { status: "IN_TRANSIT", label: "In transit" },
  { status: "DELIVERED", label: "Delivered" },
];

/** Statuses from which the customer may still self-cancel (mirrors the backend's CUSTOMER_CANCELLABLE set). */
const CUSTOMER_CANCELLABLE: OrderStatus[] = ["PENDING_PAYMENT", "PAYMENT_SUBMITTED"];

function TrackingTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = TRACKING_STEPS.findIndex((s) => s.status === status);

  return (
    <div className="flex flex-col gap-0 rounded-2xl border border-border bg-surface p-4">
      {TRACKING_STEPS.map((step, i) => {
        const reached = currentIndex >= i;
        const isLast = i === TRACKING_STEPS.length - 1;
        return (
          <div key={step.status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  reached ? "bg-accent text-accent-foreground" : "bg-zinc-200 text-zinc-500"
                }`}
              >
                {reached ? "✓" : ""}
              </div>
              {!isLast && <div className={`w-0.5 flex-1 ${reached ? "bg-accent" : "bg-zinc-200"}`} style={{ minHeight: 24 }} />}
            </div>
            <p className={`pb-6 text-sm ${reached ? "font-medium" : "text-muted"}`}>{step.label}</p>
          </div>
        );
      })}
    </div>
  );
}

function SubmitPaymentReferenceForm({ order, token, onSubmitted }: { order: OrderResponse; token: string | null; onSubmitted: (o: OrderResponse) => void }) {
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch(
        "/me/checkout/submit-payment",
        { method: "POST", body: JSON.stringify({ orderId: order.id, paymentReference: reference }) },
        token
      );
      onSubmitted({ ...order, status: "PAYMENT_SUBMITTED", paymentReference: reference });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit payment reference. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-sm text-amber-800">
        Already paid the shop owner? Enter your UPI/bank payment reference below so they can confirm it.
      </p>
      <input
        type="text"
        placeholder="Payment reference / UTR / note"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        required
        className="rounded-xl border border-border bg-white px-4 py-2.5 text-sm"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-xl bg-accent py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "I've paid - submit reference"}
      </button>
    </form>
  );
}

function CancelOrderButton({ order, token, onCancelled }: { order: OrderResponse; token: string | null; onCancelled: (o: OrderResponse) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel this order?")) return;
    setError(null);
    setCancelling(true);
    try {
      const updated = await apiFetch<OrderResponse>(`/me/orders/${order.id}/cancel`, { method: "POST" }, token);
      onCancelled(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel this order.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleCancel}
        disabled={cancelling}
        className="rounded-xl border border-red-300 py-2.5 text-sm font-semibold text-red-600 disabled:opacity-60"
      >
        {cancelling ? "Cancelling…" : "Cancel order"}
      </button>
    </div>
  );
}

function OrderDetail() {
  const params = useParams<{ id: string }>();
  const { token } = useCustomerAuth();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<OrderResponse>(`/me/orders/${params.id}`, {}, token)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load this order.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, token]);

  if (error) {
    return <p className="px-4 py-8 text-center text-sm text-red-600">{error}</p>;
  }
  if (!order) {
    return <p className="px-4 py-8 text-center text-muted">Loading…</p>;
  }

  const showTimeline = !["PENDING_PAYMENT", "PAYMENT_SUBMITTED", "PAYMENT_FAILED", "CANCELLED"].includes(order.status);
  const canCancel = CUSTOMER_CANCELLABLE.includes(order.status);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6 lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-6">
      <div className="flex items-center justify-between lg:col-span-2">
        <h1 className="text-lg font-semibold">Order #{order.id}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex flex-col gap-4">
        {showTimeline && <TrackingTimeline status={order.status} />}

        {order.manualPaymentInstructions && (
          <ManualPaymentInfo instructions={order.manualPaymentInstructions} amountInPaise={order.totalInPaise} />
        )}
        {order.status === "PENDING_PAYMENT" && order.paymentMethod === "MANUAL" && (
          <SubmitPaymentReferenceForm order={order} token={token} onSubmitted={setOrder} />
        )}
        {order.status === "PENDING_PAYMENT" && order.paymentMethod === "RAZORPAY" && (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Payment is still pending for this order.
          </p>
        )}
        {order.status === "PAYMENT_SUBMITTED" && (
          <p className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            You&apos;ve submitted your payment reference{order.paymentReference ? ` (${order.paymentReference})` : ""}. The
            shop owner will confirm receipt shortly.
          </p>
        )}
        {order.status === "PAYMENT_FAILED" && (
          <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Payment for this order failed. Please place a new order.
          </p>
        )}
        {order.status === "CANCELLED" && (
          <p className="rounded-2xl border border-border bg-zinc-50 p-4 text-sm text-muted">This order was cancelled.</p>
        )}

        {canCancel && <CancelOrderButton order={order} token={token} onCancelled={setOrder} />}
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold">Items</h2>
          <div className="flex flex-col gap-2">
            {order.items.map((line) => (
              <div key={line.itemId} className="flex items-center justify-between text-sm">
                <span>
                  {line.name} × {line.quantity}
                </span>
                <span>{formatPaise(line.lineTotalInPaise)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-col gap-1 border-t border-border pt-3 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatPaise(order.subtotalInPaise)}</span>
            </div>
            {order.discountInPaise > 0 && (
              <div className="flex justify-between text-muted">
                <span>Discount{order.couponCode ? ` (${order.couponCode})` : ""}</span>
                <span>−{formatPaise(order.discountInPaise)}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span>{formatPaise(order.totalInPaise)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold">Shipping to</h2>
          <p className="text-sm">{order.shippingFullName}</p>
          <p className="text-sm text-muted">{order.shippingPhone}</p>
          <p className="text-sm text-muted">
            {order.shippingAddressLine1}
            {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ""}, {order.shippingCity}, {order.shippingState}{" "}
            {order.shippingPincode}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage() {
  return (
    <RequireCustomerAuth>
      <OrderDetail />
    </RequireCustomerAuth>
  );
}
