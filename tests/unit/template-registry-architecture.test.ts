import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const domainSourceUrl = new URL(
  "../../src/resume-templates/domain/resume-template.ts",
  import.meta.url,
);
const registrySourceUrl = new URL(
  "../../src/resume-templates/template-registry.ts",
  import.meta.url,
);
const contractSourceUrl = new URL(
  "../../src/resume-templates/adapters/resume-template-component.ts",
  import.meta.url,
);
const templateSourceUrls = ["editorial", "minimal", "professional"].map(
  (template) =>
    new URL(
      `../../src/resume-templates/${template}/${template[0]?.toUpperCase()}${template.slice(1)}Template.tsx`,
      import.meta.url,
    ),
);

describe("template registry architecture", () => {
  it("keeps React component contracts outside the template domain", async () => {
    const [domainSource, registrySource, contractSource, ...templateSources] =
      await Promise.all([
        readFile(domainSourceUrl, "utf8"),
        readFile(registrySourceUrl, "utf8"),
        readFile(contractSourceUrl, "utf8").catch(() => ""),
        ...templateSourceUrls.map((url) => readFile(url, "utf8")),
      ]);

    expect(domainSource).not.toMatch(/from ["']react["']/);
    expect(domainSource).not.toContain("ComponentType");
    expect(domainSource).not.toContain("ResumeTemplateProps");
    expect(domainSource).not.toContain("ResumeTemplateComponent");
    expect(contractSource).toMatch(/ComponentType.*from ["']react["']/s);
    expect(contractSource).toContain("type ResumeTemplateProps");
    expect(contractSource).toContain("type ResumeTemplateComponent");
    expect(registrySource).not.toMatch(/from ["']react["']/);
    expect(registrySource).not.toContain("type ResumeTemplateProps");
    expect(registrySource).not.toContain("type ResumeTemplateComponent");
    expect(registrySource).toContain(
      'from "./adapters/resume-template-component"',
    );
    for (const templateSource of templateSources) {
      expect(templateSource).not.toContain('from "../template-registry"');
      expect(templateSource).toContain(
        'from "../adapters/resume-template-component"',
      );
    }
  });
});
