"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCustomerAuth } from "@/contexts/CustomerAuthContext";
import RequireCustomerAuth from "@/components/RequireCustomerAuth";
import { apiFetch } from "@/lib/api-client";
import { formatPaise, type OrderResponse } from "@/lib/types";
import OrderStatusBadge from "@/components/OrderStatusBadge";

function OrdersList() {
  const { token } = useCustomerAuth();
  const [orders, setOrders] = useState<OrderResponse[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<OrderResponse[]>("/me/orders", {}, token)
      .then((data) => {
        if (!cancelled) setOrders(data);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load your orders.");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return <p className="px-4 py-8 text-center text-sm text-red-600">{error}</p>;
  }

  if (orders === null) {
    return <p className="px-4 py-8 text-center text-muted">Loading…</p>;
  }

  if (orders.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-4xl">📦</p>
        <p className="text-muted">You haven&apos;t placed any orders yet.</p>
        <Link href="/" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 sm:p-6">
      <h1 className="text-lg font-semibold">Your orders</h1>
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/orders/${order.id}`}
          className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4"
        >
          <div>
            <p className="text-sm font-medium">Order #{order.id}</p>
            <p className="text-xs text-muted">{new Date(order.createdAt).toLocaleDateString()}</p>
            <p className="mt-1 text-sm font-semibold">{formatPaise(order.totalInPaise)}</p>
          </div>
          <OrderStatusBadge status={order.status} />
        </Link>
      ))}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <RequireCustomerAuth>
      <OrdersList />
    </RequireCustomerAuth>
  );
}
