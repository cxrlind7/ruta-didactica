"use client";

import Link from "next/link";
import { claseCartItemId, useStore } from "@/lib/store";

export default function AgregarClaseButton({ clase }: { clase: { id: string; titulo: string; precioMXN: number } }) {
  const { addClaseToCart, cart, hydrated } = useStore();
  const enCarrito = cart.some((item) => item.id === claseCartItemId(clase.id));

  if (hydrated && enCarrito) {
    return (
      <Link
        href="/carrito"
        className="inline-flex items-center justify-center rounded-rd-md border border-rd-violet px-4 py-2 text-xs font-bold text-rd-violet hover:bg-rd-violet/10"
      >
        En tu carrito · Ver carrito
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => addClaseToCart(clase)}
      className="inline-flex items-center justify-center rounded-rd-md bg-rd-violet px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rd-navy"
    >
      Agregar al carrito
    </button>
  );
}
