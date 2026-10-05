"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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

/** Mirrors the backend's CUSTOMER_CANCELLABLE set. */
const CUSTOMER_CANCELLABLE: OrderStatus[] = ["REQUESTED", "PENDING_PAYMENT", "PAYMENT_SUBMITTED"];

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

function CancelOrderButton({ token, onCancelled }: { token: string; onCancelled: (o: OrderResponse) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  async function handleCancel() {
    if (!confirm("Cancel this order request?")) return;
    setError(null);
    setCancelling(true);
    try {
      const updated = await apiFetch<OrderResponse>(`/public/guest/orders/${token}/cancel`, { method: "POST" });
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

/**
 * Public, no-login order-tracking page for guest checkouts - the token in
 * the URL (shared via the checkout share message) is itself the
 * authorization, same idea as an unlisted link.
 */
export default function GuestOrderTrackingPage() {
  const params = useParams<{ token: string }>();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<OrderResponse>(`/public/guest/orders/${params.token}`)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not find this order. The tracking link may be incorrect.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.token]);

  if (error) {
    return <p className="px-4 py-8 text-center text-sm text-red-600">{error}</p>;
  }
  if (!order) {
    return <p className="px-4 py-8 text-center text-muted">Loading…</p>;
  }

  const showTimeline = !["REQUESTED", "PENDING_PAYMENT", "PAYMENT_SUBMITTED", "PAYMENT_FAILED", "CANCELLED"].includes(order.status);
  const canCancel = CUSTOMER_CANCELLABLE.includes(order.status);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 p-4 sm:p-6 lg:grid lg:grid-cols-[1fr_340px] lg:items-start lg:gap-6">
      <div className="flex items-center justify-between lg:col-span-2">
        <h1 className="text-lg font-semibold">Order #{order.id}</h1>
        <OrderStatusBadge status={order.status} />
      </div>

      <div className="flex flex-col gap-4">
        {showTimeline && <TrackingTimeline status={order.status} />}

        {order.status === "REQUESTED" && (
          <p className="rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            The shop hasn&apos;t confirmed your order yet. Make sure you&apos;ve shared it with them on WhatsApp/Instagram - once
            they reserve the item(s) and share payment details, this page will update.
          </p>
        )}
        {order.manualPaymentInstructions && (
          <ManualPaymentInfo instructions={order.manualPaymentInstructions} amountInPaise={order.totalInPaise} />
        )}
        {order.status === "PAYMENT_SUBMITTED" && (
          <p className="rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
            You&apos;ve told the shop you paid{order.paymentReference ? ` (${order.paymentReference})` : ""}. They&apos;ll
            confirm receipt shortly.
          </p>
        )}
        {order.status === "CANCELLED" && (
          <p className="rounded-2xl border border-border bg-zinc-50 p-4 text-sm text-muted">This order was cancelled.</p>
        )}

        {canCancel && <CancelOrderButton token={params.token} onCancelled={setOrder} />}
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
