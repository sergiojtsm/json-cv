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

describe("template registry architecture", () => {
  it("keeps React component contracts outside the template domain", async () => {
    const [domainSource, registrySource] = await Promise.all([
      readFile(domainSourceUrl, "utf8"),
      readFile(registrySourceUrl, "utf8"),
    ]);

    expect(domainSource).not.toMatch(/from ["']react["']/);
    expect(domainSource).not.toContain("ComponentType");
    expect(domainSource).not.toContain("ResumeTemplateProps");
    expect(domainSource).not.toContain("ResumeTemplateComponent");
    expect(registrySource).toMatch(/ComponentType.*from ["']react["']/s);
    expect(registrySource).toContain("type ResumeTemplateProps");
    expect(registrySource).toContain("type ResumeTemplateComponent");
  });
});
