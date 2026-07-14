import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

type PdfExtraction = {
  pageTexts: string[];
  links: string[];
};

export async function extractPdf(buffer: Buffer): Promise<PdfExtraction> {
  const loadingTask = getDocument({ data: new Uint8Array(buffer) });
  const document = await loadingTask.promise;
  const pageTexts: string[] = [];
  const links: string[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .flatMap((item) => ("str" in item ? [item.str] : []))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const annotations = await page.getAnnotations();

    pageTexts.push(text);
    links.push(
      ...annotations.flatMap((annotation) =>
        typeof annotation.url === "string" ? [annotation.url] : [],
      ),
    );
  }

  await loadingTask.destroy();
  return { pageTexts, links };
}
