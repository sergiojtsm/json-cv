import {
  AnnotationType,
  getDocument,
  OPS,
} from "pdfjs-dist/legacy/build/pdf.mjs";

type PdfExtraction = {
  pageTexts: string[];
  links: string[];
  imageCount: number;
};

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

      pageTexts.push(text);
      links.push(
        ...annotations.flatMap((annotation) =>
          annotation.annotationType === AnnotationType.LINK &&
          typeof annotation.url === "string"
            ? [annotation.url]
            : [],
        ),
      );
      imageCount += operatorList.fnArray.filter((operation) =>
        imageOperations.has(operation),
      ).length;
    }

    return { pageTexts, links, imageCount };
  } finally {
    await loadingTask.destroy();
  }
}
