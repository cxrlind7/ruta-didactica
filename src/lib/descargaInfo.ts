import { NextResponse } from "next/server";
import type { ArchivoDrive } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkAccess } from "@/lib/motorReglas";
import type { SealInfo } from "@/lib/pdfSeal";

// Compartido entre /api/archivos/[id]/descargar (sirve el archivo sellado)
// y /api/archivos/[id]/sello (solo el texto de trazabilidad, para que los
// visores lo muestren sin tener que descargar el archivo completo).

const REASON_STATUS: Record<string, number> = {
  not_found: 404,
  not_ingested: 404,
  not_published: 403,
  not_purchased: 403,
};

const REASON_MESSAGE: Record<string, string> = {
  not_found: "Ese archivo no existe.",
  not_ingested: "Ese archivo todavía no está disponible.",
  not_purchased: "No has comprado el material que desbloquea este archivo.",
};

const TIPO_LABEL: Record<string, string> = {
  planeacion: "Planeación",
  fichas: "Fichas",
  diapositiva: "Diapositivas de apoyo visual",
  seguimiento: "Seguimiento",
};

export type ResolvedDownload = {
  archivoDrive: ArchivoDrive;
  ext: string;
  sealInfo: SealInfo;
};

export async function resolveDownloadOrError(
  sessionUser: { userId: string; email: string },
  archivoId: string
): Promise<{ ok: true; data: ResolvedDownload } | { ok: false; response: NextResponse }> {
  const result = await checkAccess(sessionUser.userId, archivoId);

  if (!result.ok) {
    if (result.reason === "not_published") {
      return {
        ok: false,
        response: NextResponse.json(
          {
            error: `Este material se habilita el ${result.publicarEl.toLocaleDateString("es-MX", { dateStyle: "long" })}.`,
          },
          { status: 403 }
        ),
      };
    }
    return {
      ok: false,
      response: NextResponse.json({ error: REASON_MESSAGE[result.reason] }, { status: REASON_STATUS[result.reason] }),
    };
  }

  const { archivoDrive, tipo, publicacion, orderId } = result;
  const ext = archivoDrive.nombreArchivo.split(".").pop()?.toLowerCase() ?? "";
  const user = await prisma.user.findUnique({ where: { id: sessionUser.userId } });
  const titulo = publicacion
    ? `${TIPO_LABEL[tipo]} · Grado ${publicacion.grado} · ${publicacion.periodo}`
    : `${TIPO_LABEL[tipo]} · Grado ${archivoDrive.grado} · ${archivoDrive.trimestre}`;

  const sealInfo: SealInfo = {
    nombre: user?.name || sessionUser.email,
    email: sessionUser.email,
    orderId: orderId ?? "VISTA-PREVIA-ADMIN",
    titulo,
  };

  return { ok: true, data: { archivoDrive, ext, sealInfo } };
}
