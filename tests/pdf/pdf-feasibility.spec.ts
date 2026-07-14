import { expect, test, type Page } from "@playwright/test";
import { extractPdf } from "./extract-pdf";

const templates = ["editorial", "minimal", "professional"] as const;
const sectionOrder = [
  "Profile",
  "Experience",
  "Volunteer",
  "Education",
  "Awards",
  "Certificates",
  "Publications",
  "Skills",
  "Languages",
  "Interests",
  "References",
  "Projects",
];
const expectedExternalLinks = [
  "https://example.com/",
  "https://example.com/acme",
  "https://example.com/article",
  "https://example.com/certificate",
  "https://example.com/foundation",
  "https://example.com/ui-kit",
  "https://example.com/university",
  "https://linkedin.com/in/alex",
];

const createPdf = async (page: Page, path: string) => {
  await page.goto(path);
  return page.pdf({
    format: "A4",
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
  });
};

for (const template of templates) {
  test(`${template}: short resume is one selectable-text page`, async ({
    page,
  }) => {
    const pdf = await createPdf(page, `/feasibility/${template}/short`);
    const result = await extractPdf(pdf);
    console.log(`${template}/short: ${result.pageTexts.length} page(s)`);
    expect(result.pageTexts).toHaveLength(1);
    expect(result.pageTexts[0]).toContain("Alex Morgan");
    expect(result.pageTexts[0]).toContain("Improved Core Web Vitals");
  });

  test(`${template}: complete resume preserves sections, order, and links`, async ({
    page,
  }) => {
    const pdf = await createPdf(page, `/feasibility/${template}/complete`);
    const result = await extractPdf(pdf);
    const repeatedResult = await extractPdf(
      await createPdf(page, `/feasibility/${template}/complete`),
    );
    const text = result.pageTexts.join(" ");
    const positions = sectionOrder.map((heading) => text.indexOf(heading));
    console.log(`${template}/complete: ${result.pageTexts.length} page(s)`);

    expect(result.pageTexts.every((pageText) => pageText.length > 0)).toBe(
      true,
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(result.imageCount).toBe(0);
    expect(text).not.toContain("photo.png");
    expect(text).not.toContain("canonical");
    expect(text).not.toContain("https://example.com/resume.json");
    expect(text).not.toContain("v1.0.0");
    expect(text).not.toContain("2026-07-14T10:00:00");
    expect(
      result.links.filter((link) => link.startsWith("http")).sort(),
    ).toEqual(expectedExternalLinks);
    expect(result.pages).toHaveLength(result.pageTexts.length);
    expect(
      result.pages.every(
        (pdfPage) =>
          pdfPage.width > 0 &&
          pdfPage.height > 0 &&
          pdfPage.textItems.length > 0 &&
          pdfPage.linkAnnotations.every(
            (annotation) => annotation.rect.length === 4,
          ),
      ),
    ).toBe(true);
    expect(repeatedResult).toEqual(result);
  });

  test(`${template}: long resume paginates without blank pages or missing entries`, async ({
    page,
  }) => {
    const pdf = await createPdf(page, `/feasibility/${template}/long`);
    const result = await extractPdf(pdf);
    const text = result.pageTexts.join(" ");
    console.log(`${template}/long: ${result.pageTexts.length} page(s)`);

    expect(result.pageTexts).toHaveLength(5);
    expect(result.pageTexts.every((pageText) => pageText.length > 40)).toBe(
      true,
    );
    expect(result.pageTexts[0]).toContain("Company 01");
    expect(result.pageTexts[1]).toContain(
      "Delivered measurable result 45 for engagement 1",
    );
    for (let index = 1; index <= 14; index += 1) {
      expect(text).toContain(`Company ${String(index).padStart(2, "0")}`);
    }
    expect(text).toContain("Delivered measurable result 45 for engagement 1");
  });
}
