import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin";

const TIPOS = ["planeacion", "fichas", "diapositiva", "seguimiento"];
const TRIMESTRES = ["T1", "T2", "T3", "CA"];

// Crea una entrada manual en el arbol (no viene de la matriz semillada):
// para casos que el seed no anticipo, ej. un recurso extra o con nombre
// distinto. Necesita su propio grado+trimestre porque no hay ninguna fila
// de Publicacion que la referencie.
export async function POST(req: NextRequest) {
  const auth = await requireAdminUser();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);
  const tipo = typeof body?.tipo === "string" ? body.tipo : "";
  const grado = Number(body?.grado);
  const trimestre = typeof body?.trimestre === "string" ? body.trimestre : "";
  const label = typeof body?.label === "string" ? body.label.trim() : "";
  const nombreArchivo = typeof body?.nombreArchivo === "string" ? body.nombreArchivo.trim() : "";

  if (!TIPOS.includes(tipo)) return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  if (!Number.isInteger(grado) || grado < 1 || grado > 6) {
    return NextResponse.json({ error: "Grado inválido" }, { status: 400 });
  }
  if (!TRIMESTRES.includes(trimestre)) return NextResponse.json({ error: "Trimestre inválido" }, { status: 400 });
  if (!label) return NextResponse.json({ error: "Falta el nombre del recurso" }, { status: 400 });
  if (!nombreArchivo) return NextResponse.json({ error: "Falta el nombre del archivo" }, { status: 400 });

  const existing = await prisma.archivoDrive.findUnique({ where: { nombreArchivo } });
  if (existing) return NextResponse.json({ error: "Ya existe un archivo con ese nombre" }, { status: 409 });

  const archivo = await prisma.archivoDrive.create({
    data: { tipo, grado, trimestre, label, nombreArchivo, manual: true },
  });

  return NextResponse.json({ id: archivo.id });
}
