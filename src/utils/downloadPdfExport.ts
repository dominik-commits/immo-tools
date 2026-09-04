// src/utils/downloadPdfExport.ts
// Ruft /api/export-pdf auf (serverseitige PDF-Erzeugung, PRO-only) und löst
// den Browser-Download der zurückgegebenen Bytes aus. Das Auslösen eines
// Downloads geht nur im Browser -- die eigentliche PDF-Erzeugung passiert
// ausschließlich auf dem Server (siehe api/export-pdf.ts).

export type PdfReportType = "etw" | "mfh" | "efh" | "mixed" | "gewerbe";

export async function downloadPdfExport(
  type: PdfReportType,
  data: unknown,
  getToken: () => Promise<string | null>
): Promise<void> {
  const token = await getToken();
  const res = await fetch("/api/export-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type, data }),
  });

  if (!res.ok) {
    throw new Error(`PDF-Export fehlgeschlagen (${res.status})`);
  }

  const blob = await res.blob();
  const contentDisposition = res.headers.get("Content-Disposition") || "";
  const match = contentDisposition.match(/filename="([^"]+)"/);
  const filename = match ? match[1] : "propora-bankbericht.pdf";

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
