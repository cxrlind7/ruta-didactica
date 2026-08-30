import { NextRequest, NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, resolveVolumePath } from "@/lib/admin";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const archivoDrive = await prisma.archivoDrive.findUnique({ where: { id } });
  if (!archivoDrive) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const label = typeof body?.label === "string" ? body.label.trim() : undefined;
  const nombreArchivo = typeof body?.nombreArchivo === "string" ? body.nombreArchivo.trim() : undefined;

  if (nombreArchivo && nombreArchivo !== archivoDrive.nombreArchivo) {
    const existing = await prisma.archivoDrive.findUnique({ where: { nombreArchivo } });
    if (existing) return NextResponse.json({ error: "Ya existe un archivo con ese nombre" }, { status: 409 });
  }

  const updated = await prisma.archivoDrive.update({
    where: { id },
    data: {
      ...(label !== undefined ? { label: label || null } : {}),
      ...(nombreArchivo ? { nombreArchivo } : {}),
    },
  });

  return NextResponse.json({ id: updated.id, label: updated.label, nombreArchivo: updated.nombreArchivo });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const archivoDrive = await prisma.archivoDrive.findUnique({ where: { id } });
  if (!archivoDrive) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  if (archivoDrive.path) {
    await unlink(resolveVolumePath(archivoDrive.path)).catch(() => {
      // si ya no existe en el volumen, igual limpiamos el registro
    });
  }

  if (archivoDrive.manual) {
    // Las filas agregadas a mano no vienen de la matriz: al borrarlas se
    // quitan del todo del arbol, no solo se marcan como "pendiente".
    await prisma.archivoDrive.delete({ where: { id } });
  } else {
    await prisma.archivoDrive.update({
      where: { id },
      data: { path: null, sizeBytes: null, ingestedAt: null },
    });
  }

  return NextResponse.json({ ok: true });
}
