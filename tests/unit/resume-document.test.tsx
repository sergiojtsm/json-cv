// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";
import { completeResume, shortResume } from "../../src/resume-fixtures/resumes";
import { templateIds } from "../../src/resume-templates/domain/resume-template";
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
  it("registers exactly the declared templates in order", () => {
    expect(Object.keys(templateRegistry)).toEqual(templateIds);
  });

  it("all registered templates render the same complete semantic resume", () => {
    const semanticDocuments = templateIds.map((templateId) => {
      const Template = templateRegistry[templateId];
      const html = renderToStaticMarkup(<Template resume={completeResume} />);
      const container = document.createElement("div");
      container.innerHTML = html;
      const semanticDocument = container.querySelector(
        "article[data-resume-document]",
      );

      expect(semanticDocument, templateId).not.toBeNull();
      expect(
        Array.from(
          semanticDocument?.querySelectorAll("h2") ?? [],
          (heading) => heading.textContent,
        ),
        templateId,
      ).toEqual(headings);

      return semanticDocument?.outerHTML.replace(/\s+/g, " ").trim();
    });

    for (const [index, semanticDocument] of semanticDocuments.entries()) {
      expect(semanticDocument, templateIds[index]).toBe(semanticDocuments[0]);
    }
  });

  it("renders every human-facing section in a stable linear order", () => {
    const html = renderToStaticMarkup(
      <ResumeDocument resume={completeResume} />,
    );
    const container = document.createElement("div");
    container.innerHTML = html;

    expect(
      Array.from(
        container.querySelectorAll("h2"),
        (heading) => heading.textContent,
      ),
    ).toEqual(headings);
    expect(html).not.toContain("photo.png");
    expect(html).not.toContain("resume-schema/master/schema.json");
    expect(html).not.toContain("canonical");
    expect(html).not.toContain("v1.0.0");
    expect(html).not.toContain("2026-07-14T10:00:00");
    expect(html).toContain('href="mailto:alex@example.com"');
    expect(html).toContain('href="https://example.com/ui-kit"');
  });

  it.each([
    ["basics.name", "Alex Morgan"],
    ["basics.label", "Senior Frontend Engineer"],
    ["basics.email", "alex@example.com"],
    ["basics.phone", "+34 600 000 000"],
    ["basics.url", "https://example.com"],
    ["basics.summary", "Frontend engineer with seven years"],
    ["basics.location.address", "Calle Mayor 1"],
    ["basics.location.postalCode", "28001"],
    ["basics.location.city", "Madrid"],
    ["basics.location.region", "Madrid"],
    ["basics.location.countryCode", "ES"],
    ["basics.profiles.network", "LinkedIn"],
    ["basics.profiles.username", "alex"],
    ["basics.profiles.url", "https://linkedin.com/in/alex"],
    ["work.name", "Acme"],
    ["work.location", "Madrid"],
    ["work.position", "Senior Frontend Engineer"],
    ["work.url", "https://example.com/acme"],
    ["work.startDate", "2022-03"],
    ["work.description", "Customer platform engineering team."],
    ["work.summary", "Leads frontend architecture."],
    ["work.highlights", "Reduced load time by 40%."],
    ["volunteer.organization", "Open Web Foundation"],
    ["volunteer.position", "Mentor"],
    ["volunteer.url", "https://example.com/foundation"],
    ["volunteer.startDate", "2021"],
    ["volunteer.summary", "Mentors junior developers."],
    ["volunteer.highlights", "Delivered twelve workshops."],
    ["education.institution", "Technical University"],
    ["education.url", "https://example.com/university"],
    ["education.area", "Computer Science"],
    ["education.studyType", "BSc"],
    ["education.startDate", "2012"],
    ["education.endDate", "2016"],
    ["education.score", "8.7/10"],
    ["education.courses", "Distributed Systems"],
    ["awards.title", "Accessibility Champion"],
    ["awards.date", "2024"],
    ["awards.awarder", "Web Guild"],
    ["awards.summary", "Recognized for accessible product leadership."],
    ["certificates.name", "Web Accessibility Specialist"],
    ["certificates.date", "2023-04"],
    ["certificates.issuer", "IAAP"],
    ["certificates.url", "https://example.com/certificate"],
    ["publications.name", "Design Systems at Scale"],
    ["publications.publisher", "Frontend Journal"],
    ["publications.releaseDate", "2023-09"],
    ["publications.url", "https://example.com/article"],
    ["publications.summary", "A practical guide to federated design systems."],
    ["skills.name", "Frontend"],
    ["skills.level", "Expert"],
    ["skills.keywords", "Accessibility"],
    ["languages.language", "Spanish"],
    ["languages.fluency", "Professional"],
    ["interests.name", "Open source"],
    ["interests.keywords", "Developer tools"],
    ["references.name", "Jordan Lee"],
    ["references.reference", "Alex consistently delivers clear"],
    ["projects.name", "Accessible UI Kit"],
    ["projects.description", "An open-source component library."],
    ["projects.highlights", "Used by four product teams."],
    ["projects.keywords", "ARIA"],
    ["projects.startDate", "2021"],
    ["projects.endDate", "2024"],
    ["projects.url", "https://example.com/ui-kit"],
    ["projects.roles", "Maintainer"],
    ["projects.entity", "Open Web Foundation"],
    ["projects.type", "open-source"],
  ])("evidences populated human-facing field %s", (_field, evidence) => {
    const html = renderToStaticMarkup(
      <ResumeDocument resume={completeResume} />,
    );

    expect(html).toContain(evidence);
  });

  it("omits headings for absent sections", () => {
    const html = renderToStaticMarkup(<ResumeDocument resume={shortResume} />);
    expect(html).toContain(">Experience<");
    expect(html).not.toContain(">Awards<");
    expect(html).not.toContain(">References<");
  });

  it("omits every section and entry when arrays contain only empty valid items", () => {
    const emptyCollectionsResume: Resume = {
      basics: { profiles: [{}] },
      work: [{}],
      volunteer: [{}],
      education: [{}],
      awards: [{}],
      certificates: [{}],
      publications: [{}],
      skills: [{}],
      languages: [{}],
      interests: [{}],
      references: [{}],
      projects: [{}],
    };

    expect(new AjvResumeValidator().validate(emptyCollectionsResume).ok).toBe(
      true,
    );

    const html = renderToStaticMarkup(
      <ResumeDocument resume={emptyCollectionsResume} />,
    );

    expect(html).toBe(
      '<article class="resume-document" data-resume-document="true"></article>',
    );
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
