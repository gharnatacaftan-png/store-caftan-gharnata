"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// One product line inside the cart. `key` uniquely identifies a product+size+color
// combination so the same article with a different size/color stays a separate line.
export interface CartLine {
  key: string;
  productId: number;
  name: string;
  name_fr?: string;
  name_en?: string;
  price: number;
  image?: string;
  size: string;
  color: string;
  quantity: number;
}

const LS_KEY = "caftan_cart";

interface CartContextType {
  lines: CartLine[];
  isOpen: boolean;
  count: number;
  subtotal: number;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartLine, "key" | "quantity"> & { quantity?: number }) => void;
  updateQty: (key: string, qty: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType>({
  lines: [],
  isOpen: false,
  count: 0,
  subtotal: 0,
  openCart: () => {},
  closeCart: () => {},
  addItem: () => {},
  updateQty: () => {},
  removeItem: () => {},
  clearCart: () => {},
});

function computeKey(productId: number, size: string, color: string) {
  return `${productId}:${size}:${color}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load the persisted cart only AFTER hydration so the first client render
  // matches the SSR output (server sees an empty cart, client sees the same).
  // Reading localStorage in the useState initializer would render the badge in
  // the client HTML but not the server HTML → hydration mismatch.
  // Updates are deferred via queueMicrotask to avoid calling setState
  // synchronously inside the effect body (react-hooks/set-state-in-effect).
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setLines(parsed as CartLine[]);
        }
      } catch { /* corrupted storage */ }
      setHydrated(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Persist every change to localStorage.
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(lines));
    } catch {
      // storage full / unavailable — cart still works in memory
    }
  }, [lines, hydrated]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((item: Omit<CartLine, "key" | "quantity"> & { quantity?: number }) => {
    const key = computeKey(item.productId, item.size, item.color);
    setLines(prev => {
      const existing = prev.find(l => l.key === key);
      if (existing) {
        return prev.map(l => l.key === key ? { ...l, quantity: l.quantity + (item.quantity || 1) } : l);
      }
      return [...prev, { ...item, key, quantity: item.quantity || 1 }];
    });
  }, []);

  const updateQty = useCallback((key: string, qty: number) => {
    setLines(prev => prev.map(l => l.key === key ? { ...l, quantity: Math.max(1, Math.min(50, qty)) } : l));
  }, []);

  const removeItem = useCallback((key: string) => {
    setLines(prev => prev.filter(l => l.key !== key));
  }, []);

  const clearCart = useCallback(() => setLines([]), []);

  const count = lines.reduce((sum, l) => sum + l.quantity, 0);
  const subtotal = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  return (
    <CartContext.Provider value={{ lines, isOpen, count, subtotal, openCart, closeCart, addItem, updateQty, removeItem, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
