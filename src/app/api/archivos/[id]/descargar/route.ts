import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { checkAccess } from "@/lib/motorReglas";
import { sealPdf } from "@/lib/pdfSeal";
import { sealDocx, sealXlsx } from "@/lib/officeSeal";
import { resolveVolumePath } from "@/lib/admin";

const MIME_BY_EXT: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });

  const { id } = await params;
  const result = await checkAccess(sessionUser.userId, id);

  if (!result.ok) {
    if (result.reason === "not_published") {
      return NextResponse.json(
        {
          error: `Este material se habilita el ${result.publicarEl.toLocaleDateString("es-MX", { dateStyle: "long" })}.`,
        },
        { status: 403 }
      );
    }
    return NextResponse.json({ error: REASON_MESSAGE[result.reason] }, { status: REASON_STATUS[result.reason] });
  }

  const { archivoDrive, tipo, publicacion, orderId } = result;
  const bytes = await readFile(resolveVolumePath(archivoDrive.path!));
  const ext = archivoDrive.nombreArchivo.split(".").pop()?.toLowerCase() ?? "";

  const user = await prisma.user.findUnique({ where: { id: sessionUser.userId } });
  const titulo = publicacion
    ? `${TIPO_LABEL[tipo]} · Grado ${publicacion.grado} · ${publicacion.periodo}`
    : `${TIPO_LABEL[tipo]} · Grado ${archivoDrive.grado} · ${archivoDrive.trimestre}`;
  const sealInfo = {
    nombre: user?.name || sessionUser.email,
    email: sessionUser.email,
    orderId: orderId ?? "VISTA-PREVIA-ADMIN",
    titulo,
  };

  if (ext === "pdf") {
    const sealed = await sealPdf(bytes, sealInfo);
    return new NextResponse(new Uint8Array(sealed), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${archivoDrive.nombreArchivo}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  if (ext === "docx" || ext === "xlsx") {
    const sealed = ext === "docx" ? await sealDocx(bytes, sealInfo) : await sealXlsx(bytes, sealInfo);
    return new NextResponse(new Uint8Array(sealed), {
      status: 200,
      headers: {
        "Content-Type": MIME_BY_EXT[ext],
        "Content-Disposition": `attachment; filename="${archivoDrive.nombreArchivo}"`,
        "Cache-Control": "no-store",
      },
    });
  }

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Disposition": `attachment; filename="${archivoDrive.nombreArchivo}"`,
      "Cache-Control": "no-store",
    },
  });
}
