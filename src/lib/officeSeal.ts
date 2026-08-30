import JSZip from "jszip";
import type { SealInfo } from "@/lib/pdfSeal";

// Equivalente al sello de pdfSeal.ts (src/lib/pdfSeal.ts) pero para
// Planeacion (.docx) y Seguimiento (.xlsx): son un zip de XML (OOXML), así
// que se abren con JSZip y se inyecta el mismo texto de trazabilidad en el
// pie de página, sin tocar el contenido real del documento. Es disuasorio,
// no DRM real, igual que el sello de PDF.
//
// Nunca debe arriesgar el archivo real del catálogo: si la estructura no es
// la esperada en algún punto, se aborta silenciosamente y se devuelven los
// bytes originales sin estampar, en vez de arriesgar un archivo corrupto.

export function buildStamp(info: SealInfo): string {
  const fecha = (info.fecha ?? new Date()).toLocaleString("es-MX", { dateStyle: "long", timeStyle: "short" });
  return `${info.nombre} · ${info.email} · Pedido ${info.orderId} · ${fecha}`;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const FOOTER_REL_TYPE = "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footer";
const FOOTER_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml";

function stampParagraphXml(stamp: string): string {
  return `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="13"/><w:color w:val="8C8C8C"/></w:rPr><w:t xml:space="preserve">${escapeXml(
    stamp
  )}</w:t></w:r></w:p>`;
}

function extractRelTarget(relsXml: string, rId: string): string | null {
  const patterns = [
    new RegExp(`<Relationship[^>]*Id="${rId}"[^>]*Target="([^"]+)"`),
    new RegExp(`<Relationship[^>]*Target="([^"]+)"[^>]*Id="${rId}"`),
  ];
  for (const re of patterns) {
    const match = relsXml.match(re);
    if (match) return match[1];
  }
  return null;
}

function uniqueRelId(relsXml: string, base: string): string {
  if (!relsXml.includes(`Id="${base}"`)) return base;
  let n = 2;
  while (relsXml.includes(`Id="${base}${n}"`)) n++;
  return `${base}${n}`;
}

export async function sealDocx(bytes: Uint8Array, info: SealInfo): Promise<Uint8Array> {
  try {
    const zip = await JSZip.loadAsync(bytes);
    const stamp = buildStamp(info);

    const documentPath = "word/document.xml";
    const documentFile = zip.file(documentPath);
    if (!documentFile) return bytes;
    let documentXml = await documentFile.async("string");

    const relsPath = "word/_rels/document.xml.rels";
    const relsFile = zip.file(relsPath);
    let relsXml =
      (await relsFile?.async("string")) ??
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    const footerRefRegex = /<w:footerReference\b[^>]*\br:id="([^"]+)"[^>]*\/>/g;
    const existingFooterRIds = new Set<string>();
    let match: RegExpExecArray | null;
    while ((match = footerRefRegex.exec(documentXml))) existingFooterRIds.add(match[1]);

    if (existingFooterRIds.size > 0) {
      let touchedAny = false;
      for (const rId of existingFooterRIds) {
        const target = extractRelTarget(relsXml, rId);
        if (!target) continue;
        const footerPath = `word/${target.replace(/^\.?\/?/, "")}`;
        const footerFile = zip.file(footerPath);
        if (!footerFile) continue;
        let footerXml = await footerFile.async("string");
        if (!footerXml.includes("</w:ftr>")) continue;
        footerXml = footerXml.replace("</w:ftr>", `${stampParagraphXml(stamp)}</w:ftr>`);
        zip.file(footerPath, footerXml);
        touchedAny = true;
      }
      if (!touchedAny) return bytes;
    } else {
      if (!documentXml.includes("<w:sectPr")) return bytes;

      const newRid = uniqueRelId(relsXml, "rIdRDStamp");
      relsXml = relsXml.replace(
        "</Relationships>",
        `<Relationship Id="${newRid}" Type="${FOOTER_REL_TYPE}" Target="footer1.xml"/></Relationships>`
      );

      const contentTypesPath = "[Content_Types].xml";
      const contentTypesFile = zip.file(contentTypesPath);
      if (contentTypesFile) {
        let contentTypesXml = await contentTypesFile.async("string");
        if (!contentTypesXml.includes("/word/footer1.xml")) {
          contentTypesXml = contentTypesXml.replace(
            "</Types>",
            `<Override PartName="/word/footer1.xml" ContentType="${FOOTER_CONTENT_TYPE}"/></Types>`
          );
          zip.file(contentTypesPath, contentTypesXml);
        }
      }

      const footerXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:ftr xmlns:w="${W_NS}">${stampParagraphXml(
        stamp
      )}</w:ftr>`;
      zip.file("word/footer1.xml", footerXml);

      documentXml = documentXml.replace(/<w:sectPr\b([^>]*?)(\/>|>)/g, (_full, attrs: string, closer: string) => {
        const footerRef = `<w:footerReference w:type="default" r:id="${newRid}"/>`;
        return closer === "/>" ? `<w:sectPr${attrs}>${footerRef}</w:sectPr>` : `<w:sectPr${attrs}>${footerRef}`;
      });

      zip.file(relsPath, relsXml);
      zip.file(documentPath, documentXml);
    }

    return await zip.generateAsync({ type: "uint8array" });
  } catch (err) {
    console.error("sealDocx falló, se devuelve el archivo sin sellar", err);
    return bytes;
  }
}

function detectSpreadsheetNsPrefix(sheetXml: string): string {
  const mainNs = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const prefixedMatch = sheetXml.match(/xmlns:(\w+)="http:\/\/schemas\.openxmlformats\.org\/spreadsheetml\/2006\/main"/);
  if (prefixedMatch) return prefixedMatch[1];
  const defaultMatch = sheetXml.match(/<worksheet[^>]*\sxmlns="([^"]+)"/);
  if (defaultMatch && defaultMatch[1] === mainNs) return "";
  return "";
}

function buildOddFooterValue(stamp: string): string {
  // &-escape a nivel Excel (no XML): un "&" literal debe duplicarse para no
  // interpretarse como inicio de un codigo de campo (&L, &C, &R, &P, ...).
  const excelEscaped = stamp.replace(/&/g, "&&");
  return `&C&7${excelEscaped}`;
}

export async function sealXlsx(bytes: Uint8Array, info: SealInfo): Promise<Uint8Array> {
  try {
    const zip = await JSZip.loadAsync(bytes);
    const stamp = buildStamp(info);
    const footerValue = escapeXml(buildOddFooterValue(stamp));

    const sheetPaths = Object.keys(zip.files).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name));
    if (sheetPaths.length === 0) return bytes;

    let touchedAny = false;
    for (const path of sheetPaths) {
      const file = zip.file(path);
      if (!file) continue;
      let xml = await file.async("string");
      const prefix = detectSpreadsheetNsPrefix(xml);
      const tag = (name: string) => (prefix ? `${prefix}:${name}` : name);

      const hfOpenClose = new RegExp(`(<${tag("headerFooter")}[^>]*>)([\\s\\S]*?)(<\\/${tag("headerFooter")}>)`);
      const hfSelfClosing = new RegExp(`<${tag("headerFooter")}([^>]*)\\/>`);
      const oddFooterRegex = new RegExp(`<${tag("oddFooter")}>[\\s\\S]*?<\\/${tag("oddFooter")}>`);
      const pageMarginsSelfClosing = new RegExp(`<${tag("pageMargins")}\\b[^>]*\\/>`);

      if (hfOpenClose.test(xml)) {
        xml = xml.replace(hfOpenClose, (_full, open: string, inner: string, close: string) => {
          const newInner = oddFooterRegex.test(inner)
            ? inner.replace(oddFooterRegex, `<${tag("oddFooter")}>${footerValue}</${tag("oddFooter")}>`)
            : `${inner}<${tag("oddFooter")}>${footerValue}</${tag("oddFooter")}>`;
          return `${open}${newInner}${close}`;
        });
        zip.file(path, xml);
        touchedAny = true;
      } else if (hfSelfClosing.test(xml)) {
        xml = xml.replace(
          hfSelfClosing,
          (_full, attrs: string) =>
            `<${tag("headerFooter")}${attrs}><${tag("oddFooter")}>${footerValue}</${tag("oddFooter")}></${tag("headerFooter")}>`
        );
        zip.file(path, xml);
        touchedAny = true;
      } else if (pageMarginsSelfClosing.test(xml)) {
        // Orden de esquema de CT_Worksheet: headerFooter va justo despues de
        // pageMargins/pageSetup y antes de rowBreaks/drawing/extLst.
        const hfBlock = `<${tag("headerFooter")}><${tag("oddFooter")}>${footerValue}</${tag("oddFooter")}></${tag(
          "headerFooter"
        )}>`;
        xml = xml.replace(pageMarginsSelfClosing, (m) => `${m}${hfBlock}`);
        zip.file(path, xml);
        touchedAny = true;
      }
      // Si no hay pageMargins ni headerFooter reconocible, se deja esa hoja
      // sin estampar en vez de arriesgar una posicion de esquema invalida.
    }

    if (!touchedAny) return bytes;
    return await zip.generateAsync({ type: "uint8array" });
  } catch (err) {
    console.error("sealXlsx falló, se devuelve el archivo sin sellar", err);
    return bytes;
  }
}
