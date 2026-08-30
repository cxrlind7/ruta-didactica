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
import { CoverageKey, RouteKey, formatMXN, routes } from "./data";

export type CartItem = {
  id: string;
  route: RouteKey;
  grade: number;
  coverage: CoverageKey;
  periodoComprado: string;
  periodoLabel: string;
  priceMXN: number;
};

export function cartItemId(route: RouteKey, grade: number, coverage: CoverageKey, periodoComprado: string) {
  return `${route}-${grade}-${coverage}-${periodoComprado}`;
}

function isValidCartItem(item: unknown): item is CartItem {
  const i = item as Partial<CartItem> | null;
  return (
    !!i &&
    typeof i === "object" &&
    !!i.route &&
    i.route in routes &&
    typeof i.grade === "number" &&
    typeof i.periodoComprado === "string"
  );
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
  addToCart: (
    route: RouteKey,
    grade: number,
    coverage: CoverageKey,
    periodoComprado: string,
    periodoLabel: string,
    priceMXN: number
  ) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  isInCart: (route: RouteKey, grade: number, coverage: CoverageKey, periodoComprado: string) => boolean;
  cartCount: number;
  cartTotal: number;
  cartTotalLabel: string;

  library: CartItem[];
  lastOrder: Order | null;
  completeOrder: (items: CartItem[]) => Order;

  account: Account;
  setAccountLocal: (email: string, name?: string) => void;
  logout: () => void;
  isLoggedIn: boolean;

  hydrated: boolean;
};

const StoreContext = createContext<StoreState | null>(null);

// v3: el carrito ahora guarda un periodo real (ej. "T1_Q01"), no solo
// ruta+grado+cobertura -- se cambia la clave para no heredar carritos viejos
// con una forma incompatible desde el localStorage de los usuarios.
const LS_CART = "rd-cart-v3";
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

  const addToCart = useCallback(
    (route: RouteKey, grade: number, coverage: CoverageKey, periodoComprado: string, periodoLabel: string, priceMXN: number) => {
      const id = cartItemId(route, grade, coverage, periodoComprado);
      setCart((prev) =>
        prev.some((item) => item.id === id) ? prev : [...prev, { id, route, grade, coverage, periodoComprado, periodoLabel, priceMXN }]
      );
    },
    []
  );

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const isInCart = useCallback(
    (route: RouteKey, grade: number, coverage: CoverageKey, periodoComprado: string) =>
      cart.some((item) => item.id === cartItemId(route, grade, coverage, periodoComprado)),
    [cart]
  );

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.priceMXN, 0), [cart]);

  // A diferencia del carrito simulado original, el pago real procesa un
  // articulo (o los que se le pasen) a la vez -- un enlace fijo de Mercado
  // Pago no puede cobrar dos combinaciones distintas en un solo pago.
  const completeOrder = useCallback((items: CartItem[]) => {
    const order: Order = {
      id: `RD-${Date.now().toString().slice(-8)}`,
      date: new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      items,
      total: items.reduce((sum, item) => sum + item.priceMXN, 0),
    };
    setLibrary((prev) => {
      const existingIds = new Set(prev.map((item) => item.id));
      return [...prev, ...items.filter((item) => !existingIds.has(item.id))];
    });
    setLastOrder(order);
    setCart((prev) => prev.filter((item) => !items.some((i) => i.id === item.id)));
    return order;
  }, []);

  // Solo actualiza el espejo local: se usa después de que /api/auth/login o
  // /api/auth/register ya validaron la contraseña y crearon la sesión de
  // servidor, para no volver a pegarle a /api/session (que no pide contraseña).
  const setAccountLocal = useCallback((email: string, name?: string) => {
    setAccount({ email, name: name || email.split("@")[0] });
  }, []);

  const logout = useCallback(() => {
    setAccount(null);
    fetch("/api/session", { method: "DELETE" }).catch(() => {});
  }, []);

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
    completeOrder,
    account,
    setAccountLocal,
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
