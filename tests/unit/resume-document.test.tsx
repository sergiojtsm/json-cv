import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { completeResume, shortResume } from "../../src/resume-fixtures/resumes";
import { ResumeDocument } from "../../src/resume-templates/shared/ResumeDocument";

const headings = [
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

describe("ResumeDocument", () => {
  it("renders every human-facing section in a stable linear order", () => {
    const html = renderToStaticMarkup(
      <ResumeDocument resume={completeResume} />,
    );
    const positions = headings.map((heading) => html.indexOf(`>${heading}<`));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).not.toContain("photo.png");
    expect(html).not.toContain("canonical");
    expect(html).toContain('href="mailto:alex@example.com"');
    expect(html).toContain('href="https://example.com/ui-kit"');
  });

  it("omits headings for absent sections", () => {
    const html = renderToStaticMarkup(<ResumeDocument resume={shortResume} />);
    expect(html).toContain(">Experience<");
    expect(html).not.toContain(">Awards<");
    expect(html).not.toContain(">References<");
  });
});
