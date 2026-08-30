export type TestDownload = {
  file: string;
  title: string;
  priceMXN: number;
};

export const TEST_DOWNLOADS: Record<string, TestDownload> = {
  "base-1-quincena": {
    file: "test-1.pdf",
    title: "Ruta Base · 1º · Quincena",
    priceMXN: 99,
  },
  "visual-3-mes": {
    file: "test-2.pdf",
    title: "Ruta Visual · 3º · Mes",
    priceMXN: 249,
  },
  "integral-6-trimestre": {
    file: "test-3.pdf",
    title: "Ruta Integral · 6º · Trimestre",
    priceMXN: 659,
  },
};

export function isTestItem(itemId: string): boolean {
  return itemId in TEST_DOWNLOADS;
}
