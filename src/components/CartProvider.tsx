"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export interface CartItemData {
  productId: number;
  name: string;
  imgUrl: string;
  amount: number;
  currency: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItemData[];
  addItem: (product: {
    id: number;
    name: string;
    imgUrl: string;
    amount: number;
    currency: string;
  }) => string | null;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  currency: string | null;
  isCartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "virellio-cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItemData[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch {
      // ignore corrupt storage
    }
    setLoaded(true);
  }, []);

  // Persist to localStorage
  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, loaded]);

  const currency = items.length > 0 ? items[0].currency : null;

  const addItem = useCallback(
    (product: {
      id: number;
      name: string;
      imgUrl: string;
      amount: number;
      currency: string;
    }): string | null => {
      setItems((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          return prev.map((i) =>
            i.productId === product.id
              ? { ...i, quantity: Math.min(i.quantity + 1, 99) }
              : i
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            imgUrl: product.imgUrl,
            amount: product.amount,
            currency: product.currency,
            quantity: 1,
          },
        ];
      });

      return null;
    },
    []
  );

  const removeItem = useCallback((productId: number) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    if (quantity < 1) {
      setItems((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, quantity: Math.min(quantity, 99) } : i
      )
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.amount * i.quantity, 0);

  if (!loaded) return null;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        currency,
        isCartOpen,
        openCart,
        closeCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
