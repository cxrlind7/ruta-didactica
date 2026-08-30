import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { getSessionUser } from "@/lib/session";
import { resolveDownloadOrError } from "@/lib/descargaInfo";
import { sealPdf } from "@/lib/pdfSeal";
import { sealDocx, sealXlsx } from "@/lib/officeSeal";
import { resolveVolumePath } from "@/lib/admin";

const MIME_BY_EXT: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });

  const { id } = await params;
  const resolved = await resolveDownloadOrError(sessionUser, id);
  if (!resolved.ok) return resolved.response;

  const { archivoDrive, ext, sealInfo } = resolved.data;
  const bytes = await readFile(resolveVolumePath(archivoDrive.path!));

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
