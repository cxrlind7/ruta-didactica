"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { CoverageKey, RouteKey, formatMXN, priceForRoute, routes } from "./data";

export type CartItem = {
  id: string;
  route: RouteKey;
  grade: number;
  coverage: CoverageKey;
  priceMXN: number;
};

export function cartItemId(route: RouteKey, grade: number, coverage: CoverageKey) {
  return `${route}-${grade}-${coverage}`;
}

function isValidCartItem(item: unknown): item is CartItem {
  const i = item as Partial<CartItem> | null;
  return !!i && typeof i === "object" && !!i.route && i.route in routes && typeof i.grade === "number";
}

type Order = {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
};

type Account = {
  name: string;
  email: string;
} | null;

type StoreState = {
  cart: CartItem[];
  addToCart: (route: RouteKey, grade: number, coverage: CoverageKey) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isInCart: (route: RouteKey, grade: number, coverage: CoverageKey) => boolean;
  cartCount: number;
  cartTotal: number;
  cartTotalLabel: string;

  library: CartItem[];
  lastOrder: Order | null;
  checkout: () => Order;

  account: Account;
  login: (email: string, name?: string) => void;
  logout: () => void;
  isLoggedIn: boolean;

  hydrated: boolean;
};

const StoreContext = createContext<StoreState | null>(null);

// v2: el carrito pasó de slugs de producto individuales a selecciones de
// ruta + grado + cobertura; se cambia la clave para no heredar datos viejos
// con una forma incompatible desde el localStorage de los usuarios.
const LS_CART = "rd-cart-v2";
const LS_LIBRARY = "rd-library-v2";
const LS_ACCOUNT = "rd-account";
const LS_LAST_ORDER = "rd-last-order-v2";

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [library, setLibrary] = useState<CartItem[]>([]);
  const [account, setAccount] = useState<Account>(null);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // One-time hydration from localStorage after mount: server and first
    // client render must stay empty to avoid an SSR/CSR markup mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCart(readLS<CartItem[]>(LS_CART, []).filter(isValidCartItem));
    setLibrary(readLS<CartItem[]>(LS_LIBRARY, []).filter(isValidCartItem));
    setAccount(readLS(LS_ACCOUNT, null));
    setLastOrder(readLS(LS_LAST_ORDER, null));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(LS_CART, JSON.stringify(cart));
  }, [cart, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(LS_LIBRARY, JSON.stringify(library));
  }, [library, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(LS_ACCOUNT, JSON.stringify(account));
  }, [account, hydrated]);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(LS_LAST_ORDER, JSON.stringify(lastOrder));
  }, [lastOrder, hydrated]);

  const addToCart = useCallback((route: RouteKey, grade: number, coverage: CoverageKey) => {
    const id = cartItemId(route, grade, coverage);
    setCart((prev) =>
      prev.some((item) => item.id === id)
        ? prev
        : [...prev, { id, route, grade, coverage, priceMXN: priceForRoute(route, coverage) }]
    );
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const isInCart = useCallback(
    (route: RouteKey, grade: number, coverage: CoverageKey) =>
      cart.some((item) => item.id === cartItemId(route, grade, coverage)),
    [cart]
  );

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.priceMXN, 0), [cart]);

  const checkout = useCallback(() => {
    const order: Order = {
      id: `RD-${Date.now().toString().slice(-8)}`,
      date: new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      items: cart,
      total: cartTotal,
    };
    setLibrary((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      return [...prev, ...cart.filter((item) => !existingIds.has(item.id))];
    });
    setLastOrder(order);
    setCart([]);
    return order;
  }, [cart, cartTotal]);

  const login = useCallback((email: string, name?: string) => {
    setAccount({ email, name: name || email.split("@")[0] });
    fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name }),
    }).catch(() => {
      // Sesión de servidor best-effort: el login local (demo) sigue funcionando aunque falle.
    });
  }, []);

  const logout = useCallback(() => setAccount(null), []);

  const value: StoreState = {
    cart,
    addToCart,
    removeFromCart,
    clearCart,
    isInCart,
    cartCount: cart.length,
    cartTotal,
    cartTotalLabel: formatMXN(cartTotal),
    library,
    lastOrder,
    checkout,
    account,
    login,
    logout,
    isLoggedIn: !!account,
    hydrated,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore debe usarse dentro de StoreProvider");
  return ctx;
}
