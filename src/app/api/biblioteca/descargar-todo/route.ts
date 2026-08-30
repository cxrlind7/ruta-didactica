import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import JSZip from "jszip";
import { getSessionUser } from "@/lib/session";
import { getBibliotecaTree } from "@/lib/bibliotecaTree";
import { resolveDownloadOrError } from "@/lib/descargaInfo";
import { sealPdf } from "@/lib/pdfSeal";
import { sealDocx, sealXlsx } from "@/lib/officeSeal";
import { resolveVolumePath } from "@/lib/admin";

const TRIMESTRE_LABEL: Record<string, string> = { T1: "Trimestre 1", T2: "Trimestre 2", T3: "Trimestre 3", CA: "Cierre anual" };
const TIPO_LABEL: Record<string, string> = { planeacion: "Planeaciones", fichas: "Fichas", diapositiva: "Diapositivas", seguimiento: "Seguimiento" };

// Descarga toda la biblioteca del usuario de un jalón, en un solo .zip
// organizado por grado/trimestre/tipo -- reusa exactamente el mismo chequeo
// de acceso y sellado de trazabilidad que la descarga individual
// (resolveDownloadOrError + sealPdf/sealDocx/sealXlsx), solo que agrupado.
export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ error: "Inicia sesión" }, { status: 401 });

  const grados = await getBibliotecaTree(sessionUser.userId);
  if (grados.length === 0) {
    return NextResponse.json({ error: "Todavía no tienes rutas adquiridas." }, { status: 404 });
  }

  const zip = new JSZip();

  for (const g of grados) {
    for (const t of g.trimestres) {
      for (const tipo of t.tipos) {
        for (const a of tipo.archivos) {
          const resolved = await resolveDownloadOrError(sessionUser, a.archivoDriveId);
          if (!resolved.ok) continue; // no debería pasar (ya viene filtrado), pero no se aborta el zip completo por uno

          const { archivoDrive, ext, sealInfo } = resolved.data;
          const bytes = await readFile(resolveVolumePath(archivoDrive.path!));
          let sealed: Uint8Array = bytes;
          if (ext === "pdf") sealed = await sealPdf(bytes, sealInfo);
          else if (ext === "docx") sealed = await sealDocx(bytes, sealInfo);
          else if (ext === "xlsx") sealed = await sealXlsx(bytes, sealInfo);

          const carpeta = `${g.grado}º grado/${TRIMESTRE_LABEL[t.trimestre] ?? t.trimestre}/${TIPO_LABEL[tipo.tipo] ?? tipo.tipo}`;
          zip.file(`${carpeta}/${archivoDrive.nombreArchivo}`, sealed);
        }
      }
    }
  }

  const zipped = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } });

  return new NextResponse(new Uint8Array(zipped), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="Mi biblioteca - Ruta Didactica.zip"',
      "Cache-Control": "no-store",
    },
  });
}
