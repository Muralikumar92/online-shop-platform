import type { OrderStatus } from "@/lib/types";

const STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-amber-100 text-amber-800",
  PAYMENT_SUBMITTED: "bg-orange-100 text-orange-800",
  PAID: "bg-blue-100 text-blue-800",
  PAYMENT_FAILED: "bg-red-100 text-red-800",
  CANCELLED: "bg-zinc-200 text-zinc-700",
  PACKED: "bg-indigo-100 text-indigo-800",
  DISPATCHED: "bg-purple-100 text-purple-800",
  IN_TRANSIT: "bg-sky-100 text-sky-800",
  DELIVERED: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Payment pending",
  PAYMENT_SUBMITTED: "Payment submitted - awaiting confirmation",
  PAID: "Paid",
  PAYMENT_FAILED: "Payment failed",
  CANCELLED: "Cancelled",
  PACKED: "Packed",
  DISPATCHED: "Dispatched",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLES[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
}
