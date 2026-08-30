import { NextResponse } from "next/server";
import { unlink } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, resolveVolumePath } from "@/lib/admin";

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

  await prisma.archivoDrive.update({
    where: { id },
    data: { path: null, sizeBytes: null, ingestedAt: null },
  });

  return NextResponse.json({ ok: true });
}
