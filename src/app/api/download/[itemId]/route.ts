import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { TEST_DOWNLOADS } from "@/lib/downloads";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const download = TEST_DOWNLOADS[itemId];
  if (!download) {
    return NextResponse.json({ error: "Aún no disponible en pruebas" }, { status: 404 });
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });
  }

  const entitlement = await prisma.entitlement.findUnique({
    where: { userId_itemId: { userId: sessionUser.userId, itemId } },
  });
  if (!entitlement) {
    return NextResponse.json({ error: "No has comprado este producto" }, { status: 403 });
  }

  const filePath = path.join(process.cwd(), "private", "downloads", download.file);
  const bytes = await readFile(filePath);

  return new NextResponse(new Uint8Array(bytes), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${download.file}"`,
      "Cache-Control": "no-store",
    },
  });
}
