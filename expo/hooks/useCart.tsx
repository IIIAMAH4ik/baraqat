import createContextHook from "@nkzw/create-context-hook";
import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  modifiers: { name: string; price: number }[];
  notes: string;
}

interface CartContextType {
  items: CartItem[];
  deliveryMethod: "pickup" | "delivery";
  deliveryAddress: string;
  promoCode: string;
  comment: string;
  addItem: (item: Omit<CartItem, "quantity" | "modifiers" | "notes">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  setDeliveryMethod: (m: "pickup" | "delivery") => void;
  setDeliveryAddress: (a: string) => void;
  setPromoCode: (c: string) => void;
  setComment: (c: string) => void;
  itemCount: number;
  subtotal: number;
}

const CART_STORAGE_KEY = "barakyat_cart";

export const [CartProvider, useCart] = createContextHook((): CartContextType => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "delivery">("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [comment, setComment] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from AsyncStorage on mount
  useEffect(() => {
    AsyncStorage.getItem(CART_STORAGE_KEY).then((stored) => {
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed.items)) setItems(parsed.items);
          if (parsed.deliveryMethod) setDeliveryMethod(parsed.deliveryMethod);
          if (parsed.deliveryAddress) setDeliveryAddress(parsed.deliveryAddress);
          if (parsed.promoCode) setPromoCode(parsed.promoCode);
          if (parsed.comment) setComment(parsed.comment);
        } catch (e) { /* corrupted data, start fresh */ }
      }
      setIsLoaded(true);
    });
  }, []);

  // Persist cart to AsyncStorage on every relevant change
  const persistCart = useCallback((newItems: CartItem[], dm: "pickup" | "delivery", da: string, pc: string, cmt: string) => {
    AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      items: newItems,
      deliveryMethod: dm,
      deliveryAddress: da,
      promoCode: pc,
      comment: cmt,
    })).catch(() => {});
  }, []);

  useEffect(() => {
    if (isLoaded) persistCart(items, deliveryMethod, deliveryAddress, promoCode, comment);
  }, [items, deliveryMethod, deliveryAddress, promoCode, comment, isLoaded, persistCart]);

  const addItem = (item: Omit<CartItem, "quantity" | "modifiers" | "notes">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { ...item, quantity: 1, modifiers: [], notes: "" }];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => {
    setItems([]);
    setPromoCode("");
    setComment("");
    setDeliveryMethod("pickup");
    setDeliveryAddress("");
    AsyncStorage.removeItem(CART_STORAGE_KEY).catch(() => {});
  };

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, item) => {
    const modifierTotal = item.modifiers.reduce((m, mod) => m + mod.price, 0);
    return sum + (item.price + modifierTotal) * item.quantity;
  }, 0);

  return {
    items,
    deliveryMethod,
    deliveryAddress,
    promoCode,
    comment,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    setDeliveryMethod,
    setDeliveryAddress,
    setPromoCode,
    setComment,
    itemCount,
    subtotal,
  };
});
