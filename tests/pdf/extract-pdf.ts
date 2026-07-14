import {
  AnnotationType,
  getDocument,
  OPS,
} from "pdfjs-dist/legacy/build/pdf.mjs";

type PdfExtraction = {
  pageTexts: string[];
  links: string[];
  imageCount: number;
  pages: PdfPageExtraction[];
};

type PdfPageExtraction = {
  width: number;
  height: number;
  textItems: Array<{
    text: string;
    transform: number[];
    width: number;
    height: number;
  }>;
  linkAnnotations: Array<{ url: string; rect: number[] }>;
};

const round = (value: number): number => Math.round(value * 1_000) / 1_000;

const imageOperations = new Set<number>([
  OPS.paintImageMaskXObject,
  OPS.paintImageMaskXObjectGroup,
  OPS.paintImageXObject,
  OPS.paintInlineImageXObject,
  OPS.paintInlineImageXObjectGroup,
  OPS.paintImageXObjectRepeat,
  OPS.paintImageMaskXObjectRepeat,
  OPS.paintSolidColorImageMask,
]);

export async function extractPdf(buffer: Buffer): Promise<PdfExtraction> {
  const loadingTask = getDocument({ data: new Uint8Array(buffer) });
  const pageTexts: string[] = [];
  const links: string[] = [];
  const pages: PdfPageExtraction[] = [];
  let imageCount = 0;

  try {
    const document = await loadingTask.promise;

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .flatMap((item) => ("str" in item ? [item.str] : []))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const annotations = await page.getAnnotations();
      const operatorList = await page.getOperatorList();
      const viewport = page.getViewport({ scale: 1 });
      const linkAnnotations = annotations.flatMap((annotation) =>
        annotation.annotationType === AnnotationType.LINK &&
        typeof annotation.url === "string"
          ? [
              {
                url: annotation.url,
                rect: annotation.rect.map(round),
              },
            ]
          : [],
      );

      pageTexts.push(text);
      links.push(...linkAnnotations.map(({ url }) => url));
      pages.push({
        width: round(viewport.width),
        height: round(viewport.height),
        textItems: content.items.flatMap((item) =>
          "str" in item
            ? [
                {
                  text: item.str,
                  transform: item.transform.map(round),
                  width: round(item.width),
                  height: round(item.height),
                },
              ]
            : [],
        ),
        linkAnnotations,
      });
      imageCount += operatorList.fnArray.filter((operation) =>
        imageOperations.has(operation),
      ).length;
    }

    return { pageTexts, links, imageCount, pages };
  } finally {
    await loadingTask.destroy();
  }
}
