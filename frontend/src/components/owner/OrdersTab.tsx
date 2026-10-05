"use client";

import { useEffect, useState, useCallback } from "react";
import { useOwnerAuth } from "@/contexts/OwnerAuthContext";
import { apiFetch, ApiError } from "@/lib/api-client";
import type { OrderResponse, OrderStatus } from "@/lib/types";
import { formatPaise } from "@/lib/types";
import OrderStatusBadge from "@/components/OrderStatusBadge";

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
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
              <p className="font-medium">Order #{order.id}</p>
              <p className="min-w-0 break-words text-sm text-muted">
                {order.customerEmail} · {formatPaise(order.totalInPaise)} · {new Date(order.createdAt).toLocaleString()}
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
