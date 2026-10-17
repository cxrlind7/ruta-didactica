import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getBibliotecaTree, getClasesCompradas } from "@/lib/bibliotecaTree";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });

  const [grados, clases] = await Promise.all([
    getBibliotecaTree(sessionUser.userId),
    getClasesCompradas(sessionUser.userId),
  ]);
  return NextResponse.json({ grados, clases });
}
