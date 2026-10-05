"use client";

import Link from "next/link";
import { useCart } from "@/contexts/CartContext";
import { formatPaise } from "@/lib/types";

export default function CartPage() {
  const { lines, updateQuantity, removeItem, subtotalInPaise } = useCart();

  if (lines.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <p className="text-4xl">🛍️</p>
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/" className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground">
          Start shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-6">
      <h1 className="text-lg font-semibold">Your cart</h1>
      <div className="flex flex-col gap-3">
        {lines.map((line) => (
          <div key={line.itemId} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-zinc-100">
              {line.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary external S3/CloudFront media URLs
                <img src={line.thumbnailUrl} alt={line.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl">🖼️</div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate text-sm font-medium">{line.name}</p>
                {line.quantity > 1 ? (
                  <div className="shrink-0 text-right">
                    <p className="text-xs text-muted">
                      {formatPaise(line.priceInPaise)} × {line.quantity}
                    </p>
                    <p className="text-sm font-semibold">{formatPaise(line.priceInPaise * line.quantity)}</p>
                  </div>
                ) : (
                  <p className="shrink-0 text-sm font-medium">{formatPaise(line.priceInPaise)}</p>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2">
                <div className="flex items-center rounded-lg border border-border w-fit">
                  <button
                    type="button"
                    onClick={() => updateQuantity(line.itemId, line.quantity - 1)}
                    className="px-2.5 py-1 text-base"
                    aria-label="Decrease quantity"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm">{line.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(line.itemId, line.quantity + 1)}
                    className="px-2.5 py-1 text-base"
                    aria-label="Increase quantity"
                  >
                    +
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(line.itemId)}
                  className="text-sm text-muted"
                  aria-label={`Remove ${line.name}`}
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-16 md:bottom-0 flex items-center justify-between rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div>
          <p className="text-xs text-muted">Subtotal</p>
          <p className="text-lg font-semibold">{formatPaise(subtotalInPaise)}</p>
        </div>
        <Link
          href="/checkout"
          className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-foreground"
        >
          Checkout
        </Link>
      </div>
    </div>
  );
}
