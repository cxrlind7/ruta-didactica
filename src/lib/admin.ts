import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function requireAdminUser() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return { error: NextResponse.json({ error: "No autenticado" }, { status: 401 }) } as const;
  }
  const user = await prisma.user.findUnique({ where: { id: sessionUser.userId } });
  if (!user || user.role !== "admin") {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 403 }) } as const;
  }
  return { user } as const;
}

// El volumen de Railway esta montado en /data. ArchivoDrive.path guarda la
// ruta relativa a esa raiz (ej. "/publicaciones/<id>.pdf").
export const VOLUME_MOUNT = "/data";
export const PUBLICACIONES_DIR = "/data/publicaciones";

export function resolveVolumePath(relativePath: string) {
  return `${VOLUME_MOUNT}${relativePath}`;
}
