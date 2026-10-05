"use client";

import { useCart } from "@/contexts/CartContext";
import type { ItemPublic } from "@/lib/types";

/**
 * Quantity stepper that mutates the cart directly - no separate "Add to
 * cart"/"Buy now" step. Tapping "+" from zero adds the item; further +/-
 * taps update the cart quantity live. Checkout is reached via the single
 * persistent checkout bar (see GlobalCheckoutBar), not from here.
 */
export default function AddToCartForm({ item, compact = false }: { item: ItemPublic; compact?: boolean }) {
  const { lines, addItem, updateQuantity } = useCart();

  const quantity = lines.find((l) => l.itemId === item.id)?.quantity ?? 0;
  const outOfStock = item.stockQuantity <= 0;
  const atMaxStock = quantity >= item.stockQuantity;

  function handleIncrease(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (quantity === 0) {
      const thumbnail = item.media.find((m) => m.type === "IMAGE")?.url ?? item.media[0]?.url ?? null;
      addItem({ itemId: item.id, name: item.name, priceInPaise: item.effectivePriceInPaise, thumbnailUrl: thumbnail }, 1);
    } else {
      updateQuantity(item.id, quantity + 1);
    }
  }

  function handleDecrease(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    updateQuantity(item.id, quantity - 1);
  }

  const btnPad = compact ? "px-3 py-1.5" : "px-5 py-3";
  const barPad = compact ? "py-1.5" : "py-3";

  if (outOfStock) {
    return (
      <button
        type="button"
        disabled
        className={`w-full rounded-xl bg-zinc-200 ${barPad} text-sm font-semibold text-muted`}
      >
        Out of stock
      </button>
    );
  }

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={handleIncrease}
        className={`w-full rounded-xl bg-accent ${barPad} text-sm font-semibold text-accent-foreground active:scale-95`}
      >
        Add to cart
      </button>
    );
  }

  return (
    <div className="flex items-center justify-center rounded-xl border border-accent">
      <button type="button" onClick={handleDecrease} className={`${btnPad} text-lg text-accent`} aria-label="Decrease quantity">
        −
      </button>
      <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
      <button
        type="button"
        onClick={handleIncrease}
        disabled={atMaxStock}
        className={`${btnPad} text-lg text-accent disabled:opacity-40`}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}
