import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { resolveDownloadOrError } from "@/lib/descargaInfo";
import { buildStamp } from "@/lib/officeSeal";

// Solo el texto de trazabilidad (nombre/correo/pedido/fecha), sin leer el
// archivo del volumen -- para que los visores lo muestren de inmediato sin
// esperar a que se descargue el documento completo.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });

  const { id } = await params;
  const resolved = await resolveDownloadOrError(sessionUser, id);
  if (!resolved.ok) return resolved.response;

  return NextResponse.json({ stamp: buildStamp(resolved.data.sealInfo) });
}
