import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type SealInfo = {
  nombre: string;
  email: string;
  orderId: string;
  titulo: string;
  fecha?: Date;
};

// Sella un PDF real (Fichas/Diapositivas) con:
//  1. una pagina inicial de trazabilidad forense (a quien se le entrego y
//     cuando), y
//  2. una estampa en el pie de cada pagina (incluida la nueva), sobre una
//     franja blanca para que se lea aun encima de una foto.
// Es disuasorio, no DRM real: cualquiera con suficiente esfuerzo puede
// quitarlo. El visor seguro (src/app/visor) agrega una capa adicional de
// disuasion (bloqueo de imprimir/guardar, overlay del correo).
export async function sealPdf(bytes: Uint8Array, info: SealInfo): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(bytes);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const fecha = (info.fecha ?? new Date()).toLocaleString("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
  });

  const notice = pdfDoc.insertPage(0, [612, 792]);
  let y = 700;
  const draw = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number] } = {}) => {
    notice.drawText(text, {
      x: 60,
      y,
      size: opts.size ?? 11,
      font: opts.bold ? fontBold : font,
      color: rgb(...(opts.color ?? [0.11, 0.18, 0.4])),
    });
    y -= (opts.size ?? 11) + 10;
  };

  draw("Aviso de trazabilidad", { size: 20, bold: true });
  y -= 6;
  draw(info.titulo, { size: 13, bold: true });
  y -= 10;
  draw("Este material es una licencia individual, no transferible.", { size: 11 });
  draw("Este ejemplar quedó identificado con los siguientes datos:", { size: 11 });
  y -= 8;
  draw(`Titular:        ${info.nombre}`, { bold: true });
  draw(`Correo:         ${info.email}`, { bold: true });
  draw(`Pedido:         ${info.orderId}`, { bold: true });
  draw(`Descargado el:  ${fecha}`, { bold: true });
  y -= 14;
  draw("La reventa o distribución masiva de este archivo no está autorizada.", {
    size: 10,
    color: [0.4, 0.4, 0.4],
  });
  draw("Cada página de este documento conserva esta identificación.", {
    size: 10,
    color: [0.4, 0.4, 0.4],
  });

  // La estampa va sobre una franja blanca semitransparente: muchas
  // diapositivas son una foto a página completa, y el texto gris sin fondo
  // casi no se leía encima. El tamaño escala con el ancho de la página (las
  // diapositivas son páginas mucho más grandes que una carta) y se reduce si
  // no cabe en una sola línea.
  const stamp = `${info.nombre} · ${info.email} · Pedido ${info.orderId} · ${fecha}`;
  const margen = 24;
  for (const page of pdfDoc.getPages()) {
    const { width } = page.getSize();
    const anchoUnitario = font.widthOfTextAtSize(stamp, 1);
    const size = Math.min(Math.max(8, width * 0.011), (width - margen * 2) / anchoUnitario);
    const alto = size * 2.2;
    page.drawRectangle({ x: 0, y: 0, width, height: alto, color: rgb(1, 1, 1), opacity: 0.82 });
    page.drawText(stamp, {
      x: margen,
      y: (alto - size) / 2 + size * 0.15,
      size,
      font,
      color: rgb(0.11, 0.18, 0.4),
    });
  }

  return pdfDoc.save();
}
