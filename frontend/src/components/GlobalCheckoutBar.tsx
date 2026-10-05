"use client";

import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/contexts/CartContext";
import { formatPaise } from "@/lib/types";

const HIDDEN_ON = ["/checkout", "/cart"];

/** Persistent "Checkout" bar shown across every storefront screen once the cart has items. */
export default function GlobalCheckoutBar() {
  const { totalQuantity, subtotalInPaise } = useCart();
  const pathname = usePathname();
  const router = useRouter();

  if (totalQuantity === 0 || HIDDEN_ON.some((p) => pathname.startsWith(p))) {
    return null;
  }

  return (
    <div className="sticky bottom-16 md:bottom-0 z-10 mx-4 mb-2 flex items-center justify-between rounded-2xl bg-foreground px-4 py-3 text-background shadow-lg md:mx-6">
      <div>
        <p className="text-xs opacity-80">
          {totalQuantity} item{totalQuantity > 1 ? "s" : ""}
        </p>
        <p className="font-semibold">{formatPaise(subtotalInPaise)}</p>
      </div>
      <button
        type="button"
        onClick={() => router.push("/cart")}
        className="rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground"
      >
        Checkout →
      </button>
    </div>
  );
}
