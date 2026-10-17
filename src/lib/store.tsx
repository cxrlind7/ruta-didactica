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
import { CoverageKey, RouteKey, RUTA_CODE, formatMXN, gradeLabel, routes } from "./data";

// Un artículo del carrito es una ruta (grado + cobertura + periodo) o una
// clase suelta. Las rutas guardadas antes de que existieran las clases no
// traen `kind`, así que sin `kind` se trata como ruta.
export type RutaCartItem = {
  kind?: "ruta";
  id: string;
  route: RouteKey;
  grade: number;
  coverage: CoverageKey;
  periodoComprado: string;
  periodoLabel: string;
  priceMXN: number;
};

export type ClaseCartItem = {
  kind: "clase";
  id: string;
  claseId: string;
  titulo: string;
  priceMXN: number;
};

export type CartItem = RutaCartItem | ClaseCartItem;

export const CLASE_ICON = "/brand/materias/espanol.png";

export function isClaseItem(item: CartItem): item is ClaseCartItem {
  return item.kind === "clase";
}

export function cartItemId(route: RouteKey, grade: number, coverage: CoverageKey, periodoComprado: string) {
  return `${route}-${grade}-${coverage}-${periodoComprado}`;
}

export function claseCartItemId(claseId: string) {
  return `clase-${claseId}`;
}

// Cómo se muestra un artículo en carrito, checkout y confirmación.
export function cartItemTexto(item: CartItem): { titulo: string; detalle: string; icon: string } {
  if (isClaseItem(item)) return { titulo: item.titulo, detalle: "Clase suelta · Español", icon: CLASE_ICON };
  const route = routes[item.route];
  return { titulo: route.label, detalle: `${gradeLabel(item.grade)} · ${item.periodoLabel}`, icon: route.icon };
}

// Lo que identifica la compra ante /api/checkout y /api/checkout/link.
export function compraBody(item: CartItem): Record<string, unknown> {
  if (isClaseItem(item)) return { claseId: item.claseId };
  return { grado: item.grade, ruta: RUTA_CODE[item.route], cobertura: item.coverage, periodoComprado: item.periodoComprado };
}

function isValidCartItem(item: unknown): item is CartItem {
  const i = item as Record<string, unknown> | null;
  if (!i || typeof i !== "object" || typeof i.id !== "string" || typeof i.priceMXN !== "number") return false;
  if (i.kind === "clase") return typeof i.claseId === "string" && typeof i.titulo === "string";
  return (
    typeof i.route === "string" &&
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
  addClaseToCart: (clase: { id: string; titulo: string; precioMXN: number }) => void;
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

  // El precio se guarda en el carrito al agregar, pero el admin lo puede
  // cambiar después (PaymentProduct) -- el servidor siempre cobra el vigente,
  // así que al cargar se actualiza para que carrito y checkout muestren lo
  // mismo que se va a cobrar.
  useEffect(() => {
    if (!hydrated) return;
    Promise.all([
      fetch("/api/payment-products").then((r) => r.json()),
      fetch("/api/clases").then((r) => r.json()),
    ])
      .then(
        ([p, c]: [
          { productos: { cobertura: string; ruta: string; precioMXN: number }[] },
          { clases: { id: string; precioMXN: number }[] },
        ]) => {
          const precioRuta = new Map(p.productos.map((x) => [`${x.cobertura}|${x.ruta}`, x.precioMXN]));
          const precioClase = new Map(c.clases.map((x) => [x.id, x.precioMXN]));
          setCart((prev) => {
            // Una clase que ya no está a la venta (desactivada o eliminada) se
            // quita del carrito: al pagarla, el servidor la rechazaría.
            const vigentes = prev.filter((item) => !isClaseItem(item) || precioClase.has(item.claseId));
            let changed = vigentes.length !== prev.length;
            const next = vigentes.map((item) => {
              const precio = isClaseItem(item)
                ? precioClase.get(item.claseId)
                : precioRuta.get(`${item.coverage}|${RUTA_CODE[item.route]}`);
              if (precio == null || precio === item.priceMXN) return item;
              changed = true;
              return { ...item, priceMXN: precio };
            });
            return changed ? next : prev;
          });
        }
      )
      .catch(() => {});
  }, [hydrated]);

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

  const addClaseToCart = useCallback((clase: { id: string; titulo: string; precioMXN: number }) => {
    const id = claseCartItemId(clase.id);
    setCart((prev) =>
      prev.some((item) => item.id === id)
        ? prev
        : [...prev, { kind: "clase", id, claseId: clase.id, titulo: clase.titulo, priceMXN: clase.precioMXN }]
    );
  }, []);

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
    addClaseToCart,
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
