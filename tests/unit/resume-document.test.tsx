// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";
import { completeResume, shortResume } from "../../src/resume-fixtures/resumes";
import { templateRegistry } from "../../src/resume-templates/template-registry";
import { ResumeDocument } from "../../src/resume-templates/shared/ResumeDocument";
import type { Resume } from "../../src/resume/domain/generated/resume";

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
  it("all registered templates render the same semantic resume", () => {
    for (const [templateId, Template] of Object.entries(templateRegistry)) {
      const html = renderToStaticMarkup(<Template resume={completeResume} />);
      expect(html, templateId).toContain("Alex Morgan");
      expect(html, templateId).toContain("Projects");
      expect(html, templateId).toContain("Accessible UI Kit");
    }
  });

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

  it("omits empty contact, entry headings, and metadata for sparse valid items", () => {
    const sparseResume: Resume = {
      basics: {},
      work: [{}, { position: "Engineer" }],
      volunteer: [{}, { organization: "Open Web" }],
      education: [{}, { area: "Computer Science", score: "A" }],
    };

    expect(new AjvResumeValidator().validate(sparseResume).ok).toBe(true);

    const html = renderToStaticMarkup(<ResumeDocument resume={sparseResume} />);

    expect(html).not.toContain("<address>");
    expect(html.match(/<h3>/g)).toHaveLength(3);
    expect(html).toContain("<h3>Engineer</h3>");
    expect(html).toContain("<h3>Open Web</h3>");
    expect(html).toContain("<h3>Computer Science</h3>");
    expect(html.match(/class="entry-meta"/g)).toHaveLength(1);
    expect(html).toContain('<p class="entry-meta">A</p>');
    expect(html).not.toContain(" · ");
  });

  it("preserves title-less content without empty elements in every remaining section", () => {
    const sparseResume: Resume = {
      awards: [{}, { summary: "Award impact" }],
      certificates: [{}, { issuer: "Standards Body" }],
      publications: [{}, { summary: "Publication abstract" }],
      skills: [{}, { level: "Expert" }],
      languages: [{}, { fluency: "Native" }],
      interests: [{}, { keywords: ["Web standards"] }],
      references: [{}, { reference: "Trusted collaborator" }],
      projects: [{}, { description: "Useful toolkit" }],
    };

    expect(new AjvResumeValidator().validate(sparseResume).ok).toBe(true);

    const html = renderToStaticMarkup(<ResumeDocument resume={sparseResume} />);
    const sparseHeadings = headings.slice(4);
    const positions = sparseHeadings.map((heading) =>
      html.indexOf(`>${heading}<`),
    );

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(html).toContain("Award impact");
    expect(html).toContain("Standards Body");
    expect(html).toContain("Publication abstract");
    expect(html).toContain("Expert");
    expect(html).toContain("Native");
    expect(html).toContain("Web standards");
    expect(html).toContain("Trusted collaborator");
    expect(html).toContain("Useful toolkit");
    expect(html).not.toMatch(
      /<(article|header|h1|h3|p|strong|blockquote|cite)(?:\s[^>]*)?><\/\1>/,
    );
    expect(html).not.toContain(" · ");
  });

  it("renders duplicate highlights and profiles without React key warnings", () => {
    const duplicateResume: Resume = {
      basics: {
        profiles: [
          { network: "LinkedIn", username: "alex" },
          { network: "LinkedIn", username: "alex" },
        ],
      },
      work: [
        {
          highlights: ["Repeated result", "Repeated result"],
        },
      ],
    };
    const container = document.createElement("div");
    const root = createRoot(container);
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);

    try {
      act(() => {
        root.render(<ResumeDocument resume={duplicateResume} />);
      });
      const keyWarnings = consoleError.mock.calls.filter(([message]) =>
        String(message).includes("same key"),
      );

      expect(keyWarnings).toHaveLength(0);
    } finally {
      act(() => root.unmount());
      consoleError.mockRestore();
    }
  });
});
