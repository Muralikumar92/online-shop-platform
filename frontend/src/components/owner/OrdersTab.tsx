"use client";

import { useEffect, useState, useCallback } from "react";
import { useOwnerAuth } from "@/contexts/OwnerAuthContext";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { OrderResponse, OrderStatus } from "@/lib/types";
import { formatPaise } from "@/lib/types";
import OrderStatusBadge from "@/components/OrderStatusBadge";

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  REQUESTED: [], // handled via dedicated Reserve/Reject buttons, not the generic status dropdown (see below)
  PENDING_PAYMENT: ["CANCELLED"],
  PAYMENT_SUBMITTED: ["PAID", "CANCELLED"],
  PAID: ["PACKED", "CANCELLED"],
  PAYMENT_FAILED: [],
  CANCELLED: [],
  PACKED: ["DISPATCHED", "CANCELLED"],
  DISPATCHED: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED"],
  DELIVERED: [],
};

export default function OrdersTab({ shopId }: { shopId: number }) {
  const { token } = useOwnerAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await apiFetch<OrderResponse[]>(`/owner/shops/${shopId}/orders`, {}, token);
      setOrders(list.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)));
    } finally {
      setLoading(false);
    }
  }, [shopId, token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleStatusChange(orderId: number, status: OrderStatus) {
    setUpdatingId(orderId);
    setError(null);
    try {
      await apiFetch(`/owner/shops/${shopId}/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update order status.");
    } finally {
      setUpdatingId(null);
    }
  }

  /** Locks stock for a guest REQUESTED order - only do this once you've actually heard from the customer (WhatsApp/Instagram DM). */
  async function handleReserve(orderId: number) {
    setUpdatingId(orderId);
    setError(null);
    try {
      await apiFetch(`/owner/shops/${shopId}/orders/${orderId}/reserve`, { method: "POST" }, token);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reserve this order - stock may no longer be available.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleReject(orderId: number) {
    if (!confirm("Reject this order request? No stock will be affected since none was reserved yet.")) return;
    await handleStatusChange(orderId, "CANCELLED");
  }

  if (loading) return <p className="text-sm text-muted">Loading orders…</p>;

  return (
    <div className="flex flex-col gap-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {orders.map((order) => (
        <div key={order.id} className="rounded-2xl border border-border bg-surface p-4">
          <button
            type="button"
            onClick={() => setExpandedId(expandedId === order.id ? null : order.id)}
            className="flex w-full min-w-0 items-center justify-between gap-3 text-left"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium">
                Order #{order.id} {order.guest && <span className="text-xs font-normal text-muted">(guest - no account)</span>}
              </p>
              <p className="min-w-0 break-words text-sm text-muted">
                {order.customerEmail ?? order.shippingPhone} · {formatPaise(order.totalInPaise)} · {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
            <OrderStatusBadge status={order.status} />
          </button>

          {expandedId === order.id && (
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 text-sm">
              <div>
                <p className="font-medium">Shipping</p>
                <p className="text-muted">
                  {order.shippingFullName} · {order.shippingPhone}
                  <br />
                  {order.shippingAddressLine1}
                  {order.shippingAddressLine2 ? `, ${order.shippingAddressLine2}` : ""}, {order.shippingCity}, {order.shippingState} -{" "}
                  {order.shippingPincode}
                </p>
              </div>
              <div>
                <p className="font-medium">Items</p>
                <ul className="text-muted">
                  {order.items.map((li) => (
                    <li key={li.itemId}>
                      {li.quantity} × {li.name} — {formatPaise(li.lineTotalInPaise)}
                    </li>
                  ))}
                </ul>
              </div>
              {order.couponCode && <p className="text-muted">Coupon: {order.couponCode} (-{formatPaise(order.discountInPaise)})</p>}
              <div>
                <p className="font-medium">Payment</p>
                <p className="text-muted">
                  Method: {order.paymentMethod === "MANUAL" ? "Pay owner directly" : "Online (Razorpay)"}
                  {order.paymentReference && (
                    <>
                      <br />
                      Reference: {order.paymentReference}
                    </>
                  )}
                </p>
              </div>
              {order.status === "REQUESTED" && (
                <div className="flex flex-col gap-2 rounded-xl border border-yellow-200 bg-yellow-50 p-3">
                  <p className="text-yellow-800">
                    A customer requested this order but it isn&apos;t paid for or confirmed yet. Reserve stock only after
                    you&apos;ve actually heard back from them (WhatsApp/Instagram DM) and matched them by phone number above -
                    otherwise an unresponsive stranger could lock up a limited-stock item.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleReserve(order.id)}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-accent-foreground disabled:opacity-60"
                    >
                      Reserve stock & accept
                    </button>
                    <button
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => handleReject(order.id)}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              )}
              {NEXT_STATUSES[order.status].length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="font-medium">Update status:</label>
                  <select
                    value=""
                    disabled={updatingId === order.id}
                    onChange={(e) => e.target.value && handleStatusChange(order.id, e.target.value as OrderStatus)}
                    className="rounded-xl border border-border px-3 py-1.5 text-sm"
                  >
                    <option value="">Choose…</option>
                    {NEXT_STATUSES[order.status].map((s) => (
                      <option key={s} value={s}>
                        {s === "PAID" && order.paymentMethod === "MANUAL" ? "PAID (confirm payment received)" : s}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
      {orders.length === 0 && <p className="text-sm text-muted">No orders yet.</p>}
    </div>
  );
}
