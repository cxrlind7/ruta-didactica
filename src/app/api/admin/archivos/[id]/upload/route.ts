import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireAdminUser, PUBLICACIONES_DIR } from "@/lib/admin";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const archivoDrive = await prisma.archivoDrive.findUnique({ where: { id } });
  if (!archivoDrive) return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });

  const formData = await req.formData().catch(() => null);
  const file = formData?.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }

  const ext = path.extname(file.name) || ".bin";
  const filename = `${archivoDrive.id}${ext}`;
  const relativePath = `/publicaciones/${filename}`;

  await mkdir(PUBLICACIONES_DIR, { recursive: true });
  const bytes = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(PUBLICACIONES_DIR, filename), bytes);

  const updated = await prisma.archivoDrive.update({
    where: { id },
    data: { path: relativePath, sizeBytes: bytes.length, ingestedAt: new Date() },
  });

  return NextResponse.json({
    id: updated.id,
    path: updated.path,
    sizeBytes: updated.sizeBytes,
    ingestedAt: updated.ingestedAt,
  });
}
