import JSZip from "jszip";

// Vista previa simplificada de .xlsx en el navegador: valores de celda como
// tabla HTML (sin fórmulas, formatos numéricos ni gráficas). Se apoya solo en
// JSZip (ya usado en el proyecto) + el DOMParser nativo del navegador, para
// no repetir el error ya evitado en esta sesión de meter el paquete "xlsx"
// (CVEs sin parchar) solo para una vista previa.

export type XlsxWorkbook = {
  zip: JSZip;
  sharedStrings: string[];
  sheets: { name: string; path: string }[];
};

function localName(tag: string): string {
  const idx = tag.indexOf(":");
  return idx === -1 ? tag : tag.slice(idx + 1);
}

function parseXml(xml: string): Document {
  // Algunos de los xlsx reales traen BOM antes de la declaracion <?xml?> en
  // sus partes internas -- lo quitamos para no romper el parseo.
  const clean = xml.charCodeAt(0) === 0xfeff ? xml.slice(1) : xml;
  return new DOMParser().parseFromString(clean, "application/xml");
}

function childrenByLocalName(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((el) => localName(el.tagName) === name);
}

function firstChildByLocalName(parent: Element, name: string): Element | null {
  return childrenByLocalName(parent, name)[0] ?? null;
}

function textOfLocalName(parent: Element, name: string): string {
  const els = Array.from(parent.getElementsByTagName("*")).filter((el) => localName(el.tagName) === name);
  return els.map((el) => el.textContent ?? "").join("");
}

function getAttrLocal(el: Element, name: string): string | null {
  for (const attr of Array.from(el.attributes)) {
    if (localName(attr.name) === name) return attr.value;
  }
  return null;
}

function colLetterToIndex(ref: string): number {
  const letters = ref.match(/[A-Z]+/)?.[0] ?? "A";
  let idx = 0;
  for (const ch of letters) idx = idx * 26 + (ch.charCodeAt(0) - 64);
  return idx - 1;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function parseSharedStrings(xml: string | null): string[] {
  if (!xml) return [];
  const doc = parseXml(xml);
  return childrenByLocalName(doc.documentElement, "si").map((si) => textOfLocalName(si, "t"));
}

export async function loadXlsxWorkbook(bytes: ArrayBuffer): Promise<XlsxWorkbook> {
  const zip = await JSZip.loadAsync(bytes);

  const sharedStringsXml = (await zip.file("xl/sharedStrings.xml")?.async("string")) ?? null;
  const sharedStrings = parseSharedStrings(sharedStringsXml);

  const workbookXml = await zip.file("xl/workbook.xml")?.async("string");
  const relsXml = await zip.file("xl/_rels/workbook.xml.rels")?.async("string");
  if (!workbookXml || !relsXml) throw new Error("Estructura de xlsx inesperada");

  const workbookDoc = parseXml(workbookXml);
  const sheetsRoot = firstChildByLocalName(workbookDoc.documentElement, "sheets");
  const sheetEls = sheetsRoot ? childrenByLocalName(sheetsRoot, "sheet") : [];

  const relsDoc = parseXml(relsXml);
  const targetByRid = new Map<string, string>();
  for (const rel of Array.from(relsDoc.documentElement.children)) {
    const id = rel.getAttribute("Id");
    const target = rel.getAttribute("Target");
    if (id && target) targetByRid.set(id, target.replace(/^\.?\//, ""));
  }

  const sheets = sheetEls.map((sheetEl) => {
    const name = sheetEl.getAttribute("name") ?? "Hoja";
    const rId = getAttrLocal(sheetEl, "id") ?? "";
    const target = targetByRid.get(rId) ?? "";
    const path = `xl/${target.replace(/^xl\//, "")}`;
    return { name, path };
  });

  return { zip, sharedStrings, sheets };
}

const MAX_ROWS = 500;
const MAX_COLS = 30;

export async function renderSheetHtml(workbook: XlsxWorkbook, sheetIndex: number): Promise<string> {
  const sheet = workbook.sheets[sheetIndex];
  if (!sheet) return "<p>Hoja no encontrada.</p>";
  const file = workbook.zip.file(sheet.path);
  if (!file) return "<p>No se pudo leer esta hoja.</p>";

  const xml = await file.async("string");
  const doc = parseXml(xml);
  const sheetData = firstChildByLocalName(doc.documentElement, "sheetData");
  if (!sheetData) return "<p>Esta hoja no tiene datos.</p>";

  const mergeSpan = new Map<string, { rowspan: number; colspan: number }>();
  const mergeSkip = new Set<string>();
  const mergeCellsEl = firstChildByLocalName(doc.documentElement, "mergeCells");
  if (mergeCellsEl) {
    for (const mc of childrenByLocalName(mergeCellsEl, "mergeCell")) {
      const ref = mc.getAttribute("ref");
      if (!ref || !ref.includes(":")) continue;
      const [start, end] = ref.split(":");
      const startCol = colLetterToIndex(start);
      const endCol = colLetterToIndex(end);
      const startRow = parseInt(start.match(/\d+/)?.[0] ?? "0", 10);
      const endRow = parseInt(end.match(/\d+/)?.[0] ?? "0", 10);
      mergeSpan.set(`${startRow},${startCol}`, { rowspan: endRow - startRow + 1, colspan: endCol - startCol + 1 });
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          if (r === startRow && c === startCol) continue;
          mergeSkip.add(`${r},${c}`);
        }
      }
    }
  }

  const rows = childrenByLocalName(sheetData, "row");
  let html = '<table class="rd-xlsx-preview">';
  let truncatedRows = false;
  let rowsRendered = 0;

  for (const rowEl of rows) {
    if (rowsRendered >= MAX_ROWS) {
      truncatedRows = true;
      break;
    }
    const rowNum = parseInt(rowEl.getAttribute("r") ?? "0", 10);
    let rowHtml = "";

    for (const cellEl of childrenByLocalName(rowEl, "c")) {
      const ref = cellEl.getAttribute("r") ?? "";
      const colIdx = colLetterToIndex(ref);
      if (colIdx >= MAX_COLS) continue;
      if (mergeSkip.has(`${rowNum},${colIdx}`)) continue;

      const type = cellEl.getAttribute("t");
      const vEl = firstChildByLocalName(cellEl, "v");
      const isEl = firstChildByLocalName(cellEl, "is");
      let text = "";
      if (type === "s" && vEl) {
        const idx = parseInt(vEl.textContent ?? "-1", 10);
        text = workbook.sharedStrings[idx] ?? "";
      } else if (isEl) {
        text = textOfLocalName(isEl, "t");
      } else if (vEl) {
        text = vEl.textContent ?? "";
      }

      const merge = mergeSpan.get(`${rowNum},${colIdx}`);
      const attrs = merge ? ` rowspan="${merge.rowspan}" colspan="${merge.colspan}"` : "";
      rowHtml += `<td${attrs}>${escapeHtml(text)}</td>`;
    }

    if (rowHtml) {
      html += `<tr>${rowHtml}</tr>`;
      rowsRendered++;
    }
  }

  html += "</table>";
  if (truncatedRows) {
    html += `<p class="rd-xlsx-truncated">Vista previa limitada a ${MAX_ROWS} filas — usa "Descargar" para ver la hoja completa.</p>`;
  }
  return html;
}
