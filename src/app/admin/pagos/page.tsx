"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import LoadingScreen from "@/components/LoadingScreen";
import { EditIcon } from "@/components/icons";

type Account = { email: string; role: string } | null;

type Producto = {
  id: string;
  codigo: string;
  cobertura: string;
  ruta: string;
  precioMXN: number;
  active: boolean;
};

type PedidoItem = {
  grado: number | null;
  ruta: string | null;
  cobertura: string | null;
  periodoComprado: string | null;
  paymentCode: string | null;
  priceMXN: number;
};

type Pedido = {
  id: string;
  status: string;
  totalMXN: number;
  mpOrderId: string | null;
  createdAt: string;
  cliente: { email: string; nombre: string | null };
  items: PedidoItem[];
};

const COBERTURA_LABEL: Record<string, string> = { quincena: "Quincena", mes: "Mes", trimestre: "Trimestre", ciclo: "Ciclo completo" };
const RUTA_LABEL: Record<string, string> = { BASE: "Base", VISUAL: "Visual", SEGUIMIENTO: "Seguimiento", INTEGRAL: "Integral" };
const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: "Pendiente", className: "bg-amber-50 text-amber-700 ring-amber-200" },
  approved: { label: "Pagado", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  rejected: { label: "Rechazado", className: "bg-red-50 text-red-600 ring-red-200" },
  cancelled: { label: "Cancelado", className: "bg-slate-100 text-slate-500 ring-slate-200" },
};

function formatMXN(n: number) {
  return n.toLocaleString("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });
}

export default function AdminPagosPage() {
  const router = useRouter();
  const [account, setAccount] = useState<Account | "loading">("loading");
  const [modoPago, setModoPago] = useState<string | null>(null);
  const [permitirTarjeta, setPermitirTarjeta] = useState<boolean | null>(null);
  const [confirmingModo, setConfirmingModo] = useState<string | null>(null);
  const [productos, setProductos] = useState<Producto[] | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const loadAll = useCallback(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((d: { modoPago: string; permitirTarjetaProduccion: boolean }) => {
        setModoPago(d.modoPago);
        setPermitirTarjeta(d.permitirTarjetaProduccion);
      })
      .catch(() => setError("No se pudo cargar el modo de pago."));
    fetch("/api/admin/payment-products")
      .then((res) => res.json())
      .then((d: { productos: Producto[] }) => setProductos(d.productos))
      .catch(() => setError("No se pudieron cargar los enlaces de pago."));
    fetch("/api/admin/pedidos")
      .then((res) => res.json())
      .then((d: { pedidos: Pedido[] }) => setPedidos(d.pedidos))
      .catch(() => setError("No se pudo cargar el listado de pedidos."));
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: { account: Account }) => setAccount(data.account));
  }, []);

  useEffect(() => {
    if (account && account !== "loading" && account.role === "admin") loadAll();
  }, [account, loadAll]);

  async function applyModoPago(modo: string) {
    setBusy("modo");
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modoPago: modo }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setModoPago(data.modoPago);
    } catch {
      setError("No se pudo cambiar el modo de pago.");
    } finally {
      setBusy(null);
      setConfirmingModo(null);
    }
  }

  async function applyPermitirTarjeta(value: boolean) {
    setBusy("tarjeta");
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permitirTarjetaProduccion: value }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPermitirTarjeta(data.permitirTarjetaProduccion);
    } catch {
      setError("No se pudo actualizar la opción de tarjeta en producción.");
    } finally {
      setBusy(null);
    }
  }

  async function saveProducto(codigo: string, data: { precioMXN?: number }) {
    setBusy(codigo);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payment-products/${codigo}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error();
      loadAll();
    } catch {
      setError("No se pudo guardar el producto.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleActive(codigo: string, active: boolean) {
    setBusy(codigo);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payment-products/${codigo}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error();
      loadAll();
    } catch {
      setError("No se pudo actualizar el producto.");
    } finally {
      setBusy(null);
    }
  }

  async function confirmarPedido(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${id}/confirmar`, { method: "POST" });
      if (!res.ok) throw new Error();
      loadAll();
    } catch {
      setError("No se pudo confirmar el pedido.");
    } finally {
      setBusy(null);
    }
  }

  async function cancelarPedido(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch(`/api/admin/pedidos/${id}/cancelar`, { method: "POST" });
      if (!res.ok) throw new Error();
      loadAll();
    } catch {
      setError("No se pudo cancelar el pedido.");
    } finally {
      setBusy(null);
    }
  }

  async function handleLogout() {
    await fetch("/api/session", { method: "DELETE" }).catch(() => {});
    router.push("/");
  }

  if (account === "loading") return <LoadingScreen label="Cargando…" />;

  if (!account) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-rd-navy">Panel de administración</h1>
        <p className="mt-2 text-sm text-slate-500">Necesitas iniciar sesión con una cuenta de administrador.</p>
        <Link
          href="/cuenta/iniciar-sesion"
          className="mt-6 inline-flex rounded-rd-md bg-rd-violet px-6 py-3 text-sm font-semibold text-white hover:bg-rd-navy transition"
        >
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (account.role !== "admin") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <h1 className="text-xl font-bold text-rd-navy">No autorizado</h1>
        <p className="mt-2 text-sm text-slate-500">La cuenta {account.email} no tiene permisos de administrador.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-rd-violet">Panel de administración</p>
          <h1 className="mt-1 text-2xl font-extrabold text-rd-navy">Pagos</h1>
          <p className="mt-1 text-sm text-slate-500">Modo de cobro, precios/enlaces y confirmación de pedidos.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-sm font-semibold text-rd-violet hover:underline">
            ← Archivos del catálogo
          </Link>
          <button type="button" onClick={handleLogout} className="text-sm font-semibold text-slate-500 hover:text-rd-navy">
            Cerrar sesión ({account.email})
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-6 rounded-rd-sm border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{error}</p>
      )}

      {/* Modo de pago */}
      <section className="mt-8 rounded-rd-md border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-bold text-rd-navy">Modo de cobro</h2>
        <p className="mt-1 text-xs text-slate-500">
          Controla cómo se cobra en todo el sitio. En pruebas se usa el checkout dinámico con tarjeta (Mercado Pago Orders
          API) con tarjetas de prueba. En producción, el comprador elige pagar con un link de pago generado por pedido
          (Mercado Pago Checkout Pro, confirma solo) o, si lo activas abajo, también con tarjeta.
        </p>

        {modoPago === null ? (
          <p className="mt-4 text-xs text-slate-400">Cargando…</p>
        ) : (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="inline-flex rounded-rd-md border border-slate-200 p-1">
              <button
                type="button"
                disabled={busy === "modo"}
                onClick={() => {
                  setConfirmingModo(null);
                  applyModoPago("prueba");
                }}
                className={`rounded-rd-sm px-4 py-2 text-xs font-bold transition ${
                  modoPago === "prueba" ? "bg-rd-navy text-white" : "text-slate-500 hover:text-rd-navy"
                }`}
              >
                Modo de pruebas
              </button>
              <button
                type="button"
                disabled={busy === "modo"}
                onClick={() => setConfirmingModo("produccion")}
                className={`rounded-rd-sm px-4 py-2 text-xs font-bold transition ${
                  modoPago === "produccion" ? "bg-emerald-600 text-white" : "text-slate-500 hover:text-rd-navy"
                }`}
              >
                Producción (links reales)
              </button>
            </div>
            {modoPago === "produccion" && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
                En vivo: cobrando con links de pago reales
              </span>
            )}
          </div>
        )}

        {permitirTarjeta !== null && (
          <div className="mt-4 rounded-rd-sm border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-start gap-2.5">
              <input
                type="checkbox"
                checked={permitirTarjeta}
                disabled={busy === "tarjeta"}
                onChange={(e) => applyPermitirTarjeta(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-rd-violet"
              />
              <span>
                <span className="block text-xs font-bold text-rd-navy">Permitir pagar con tarjeta en producción</span>
                <span className="mt-0.5 block text-[11px] text-slate-500">
                  Solo actívalo cuando tu integración de Mercado Pago ya esté activada/certificada para cobros reales
                  — antes de eso, ese checkout solo acepta tarjetas de prueba, inútiles para clientes reales. Con esto
                  apagado (por defecto), en producción el comprador solo ve la opción de link de pago.
                </span>
              </span>
            </label>
          </div>
        )}

        {confirmingModo === "produccion" && (
          <div className="mt-4 rounded-rd-sm border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-800">
              Vas a activar el cobro en vivo con los 16 enlaces reales de Mercado Pago para todos los visitantes.
              ¿Confirmas?
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => applyModoPago("produccion")}
                className="rounded-rd-sm bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Sí, activar producción
              </button>
              <button
                type="button"
                onClick={() => setConfirmingModo(null)}
                className="rounded-rd-sm px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-rd-navy"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Precios y enlaces */}
      <section className="mt-6 rounded-rd-md border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h2 className="text-sm font-bold text-rd-navy">Precios (16 productos)</h2>
          <p className="text-xs text-slate-500">
            Un mismo código cubre los 6 grados. El precio de aquí es el que se usa para generar el link de pago de
            cada compra. Desactivar un producto lo oculta en /planes.
          </p>
        </div>
        {productos === null ? (
          <p className="px-5 py-6 text-xs text-slate-400">Cargando…</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {productos.map((p) => (
              <ProductoRow
                key={p.codigo}
                producto={p}
                busy={busy === p.codigo}
                onSave={(data) => saveProducto(p.codigo, data)}
                onToggleActive={(active) => toggleActive(p.codigo, active)}
              />
            ))}
          </ul>
        )}
      </section>

      {/* Pedidos */}
      <section className="mt-6 rounded-rd-md border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-3">
          <h2 className="text-sm font-bold text-rd-navy">Pedidos</h2>
          <p className="text-xs text-slate-500">
            Los pedidos pagados por link se confirman solos en cuanto llega el webhook de Mercado Pago. Si por algún
            motivo no llega, quedan &ldquo;Pendiente&rdquo; y puedes confirmarlos aquí a mano.
          </p>
        </div>
        {pedidos === null ? (
          <p className="px-5 py-6 text-xs text-slate-400">Cargando…</p>
        ) : pedidos.length === 0 ? (
          <p className="px-5 py-6 text-center text-xs text-slate-400">Todavía no hay pedidos.</p>
        ) : (
          <ul className="max-h-[32rem] divide-y divide-slate-100 overflow-y-auto">
            {pedidos.map((pedido) => (
              <PedidoRow
                key={pedido.id}
                pedido={pedido}
                busy={busy === pedido.id}
                onConfirmar={() => confirmarPedido(pedido.id)}
                onCancelar={() => cancelarPedido(pedido.id)}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ProductoRow({
  producto,
  busy,
  onSave,
  onToggleActive,
}: {
  producto: Producto;
  busy: boolean;
  onSave: (data: { precioMXN?: number }) => void;
  onToggleActive: (active: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [precio, setPrecio] = useState(String(producto.precioMXN));

  function startEditing() {
    setPrecio(String(producto.precioMXN));
    setEditing(true);
  }

  function save() {
    const precioNum = Number(precio);
    onSave({ precioMXN: Number.isFinite(precioNum) ? precioNum : undefined });
    setEditing(false);
  }

  return (
    <li className="px-5 py-3 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        <span className="w-10 shrink-0 rounded-rd-sm bg-rd-violet/10 px-2 py-1 text-center font-mono font-bold text-rd-violet">
          {producto.codigo}
        </span>
        <span className="shrink-0 text-slate-500">
          {COBERTURA_LABEL[producto.cobertura] ?? producto.cobertura} · {RUTA_LABEL[producto.ruta] ?? producto.ruta}
        </span>

        {!editing && <span className="font-bold text-rd-navy">{formatMXN(producto.precioMXN)}</span>}

        <span className="ml-auto flex shrink-0 items-center gap-2">
          <label className="flex items-center gap-1.5 text-slate-500">
            <input
              type="checkbox"
              checked={producto.active}
              disabled={busy}
              onChange={(e) => onToggleActive(e.target.checked)}
              className="h-3.5 w-3.5 accent-rd-violet"
            />
            Activo
          </label>
          {!editing && (
            <button
              type="button"
              disabled={busy}
              onClick={startEditing}
              className="flex items-center gap-1 rounded-rd-sm border border-slate-200 px-2 py-1 font-semibold text-rd-navy hover:border-rd-sky"
            >
              <EditIcon className="h-3 w-3" />
              Editar
            </button>
          )}
        </span>
      </div>

      {editing && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            type="number"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            className="w-24 rounded-rd-sm border border-slate-200 px-2 py-1 text-xs focus:border-rd-violet focus:outline-none"
          />
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="rounded-rd-sm bg-rd-violet px-3 py-1 font-semibold text-white hover:bg-rd-navy disabled:opacity-40"
          >
            Guardar
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-rd-sm px-3 py-1 font-semibold text-slate-500 hover:text-rd-navy"
          >
            Cancelar
          </button>
        </div>
      )}
    </li>
  );
}

function PedidoRow({
  pedido,
  busy,
  onConfirmar,
  onCancelar,
}: {
  pedido: Pedido;
  busy: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  const item = pedido.items[0];
  const statusMeta = STATUS_LABEL[pedido.status] ?? { label: pedido.status, className: "bg-slate-100 text-slate-500 ring-slate-200" };
  const fecha = new Date(pedido.createdAt).toLocaleString("es-MX", { dateStyle: "medium", timeStyle: "short" });

  return (
    <li className="flex flex-wrap items-center gap-3 px-5 py-3 text-xs">
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-rd-navy">{pedido.cliente.nombre || pedido.cliente.email}</p>
        <p className="truncate text-slate-400">{pedido.cliente.email}</p>
      </div>
      <div className="min-w-0 flex-1 text-slate-500">
        {item ? (
          <p>
            {item.grado}º grado · {RUTA_LABEL[item.ruta ?? ""] ?? item.ruta} · {COBERTURA_LABEL[item.cobertura ?? ""] ?? item.cobertura}{" "}
            <span className="text-slate-400">({item.periodoComprado})</span>
          </p>
        ) : (
          <p className="text-slate-400">Sin detalle</p>
        )}
        {item?.paymentCode && <p className="text-[10px] text-slate-400">Código {item.paymentCode}</p>}
      </div>
      <span className="shrink-0 font-bold text-rd-navy">{formatMXN(pedido.totalMXN)}</span>
      <span className={`shrink-0 rounded-full px-2 py-0.5 font-bold ring-1 ${statusMeta.className}`}>{statusMeta.label}</span>
      <span className="shrink-0 text-[10px] text-slate-400">{fecha}</span>
      {pedido.status === "pending" && (
        <span className="flex shrink-0 gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirmar}
            className="rounded-rd-sm bg-emerald-600 px-2.5 py-1 font-bold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Confirmar pago
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancelar}
            className="rounded-rd-sm border border-slate-200 px-2.5 py-1 font-semibold text-slate-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
          >
            Cancelar
          </button>
        </span>
      )}
    </li>
  );
}
