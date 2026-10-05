"use client";

import Link from "next/link";
import { useCart } from "@/contexts/CartContext";

export default function CartBadgeLink() {
  const { totalQuantity } = useCart();
  return (
    <Link href="/cart" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-xl" aria-label="View cart">
      🛍️
      {totalQuantity > 0 && (
        <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-semibold text-accent-foreground">
          {totalQuantity}
        </span>
      )}
    </Link>
  );
}
