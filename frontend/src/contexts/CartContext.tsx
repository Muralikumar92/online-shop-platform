"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { CartLine } from "@/lib/types";

const CART_KEY = "shopplatform.cart";

interface CartState {
  lines: CartLine[];
  addItem: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  removeItem: (itemId: number) => void;
  clear: () => void;
  subtotalInPaise: number;
  totalQuantity: number;
}

const CartContext = createContext<CartState | null>(null);

// Cart lives entirely client-side (localStorage) - the backend only ever
// sees the final cart contents at checkout time, where stock is validated
// and reserved atomically. This keeps the cart simple and device-local.
export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    function hydrate() {
      const raw = window.localStorage.getItem(CART_KEY);
      if (raw) {
        try {
          setLines(JSON.parse(raw));
        } catch {
          // ignore corrupt cart data
        }
      }
      setHydrated(true);
    }
    hydrate();
  }, []);

  useEffect(() => {
    if (hydrated) {
      window.localStorage.setItem(CART_KEY, JSON.stringify(lines));
    }
  }, [lines, hydrated]);

  const addItem = useCallback((line: Omit<CartLine, "quantity">, quantity = 1) => {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === line.itemId);
      if (existing) {
        return prev.map((l) => (l.itemId === line.itemId ? { ...l, quantity: l.quantity + quantity } : l));
      }
      return [...prev, { ...line, quantity }];
    });
  }, []);

  const updateQuantity = useCallback((itemId: number, quantity: number) => {
    setLines((prev) =>
      quantity <= 0 ? prev.filter((l) => l.itemId !== itemId) : prev.map((l) => (l.itemId === itemId ? { ...l, quantity } : l))
    );
  }, []);

  const removeItem = useCallback((itemId: number) => {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const subtotalInPaise = useMemo(() => lines.reduce((sum, l) => sum + l.priceInPaise * l.quantity, 0), [lines]);
  const totalQuantity = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  const value = useMemo(
    () => ({ lines, addItem, updateQuantity, removeItem, clear, subtotalInPaise, totalQuantity }),
    [lines, addItem, updateQuantity, removeItem, clear, subtotalInPaise, totalQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
