# PDF Feasibility Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove that three complete, ATS-oriented JSON Resume templates can produce deterministic, selectable-text, multipage A4 PDFs in desktop Chromium without a production server.

**Architecture:** Create the smallest executable slice of the approved Screaming/Hexagonal architecture: a technology-free `resume` domain, a typed template contract, three React template adapters, Astro fixture routes, and Playwright/PDF.js acceptance tests. Do not build the editor, persistence, import/export UI, or landing page until this gate passes.

**Tech Stack:** Node.js 24, npm, Astro 7, React 19, TypeScript 5.9, `@jsonresume/schema` 1.3, AJV 8, `json-schema-to-typescript`, Vitest, Playwright Chromium, PDF.js, CSS Paged Media.

## Global Constraints

- Production output is fully static and has no API routes or server runtime.
- PDF generation is officially supported only on current stable desktop Chrome/Chromium.
- PDF page size is A4; content may span multiple pages and must never be arbitrarily shrunk to one page.
- Preview and PDF must use the same semantic DOM.
- Every populated human-facing JSON Resume section must render; `meta` and `basics.image` are preserved but not printed.
- Templates use one column, linear DOM order, selectable text, real links, and no icon-only content, photographs, skill charts, or layout tables.
- `@jsonresume/schema@1.3.0` is the only resume contract; generated TypeScript types must not be edited manually.
- Zod, Redux, Zustand, direct client PDF renderers, and server PDF generation are excluded.
- This plan stops after a documented PDF feasibility decision. Editor and landing implementation require later plans.

---

## Planned File Map

```text
.
├── .gitignore                         # Build, test, dependency, and visual-companion exclusions
├── .nvmrc                             # Reproducible local Node major/version
├── astro.config.mjs                   # Static Astro plus React integration
├── package.json                       # Exact scripts and dependency versions
├── playwright.config.ts               # Chromium PDF test server/configuration
├── prettier.config.mjs                # Formatting rules for TS, Astro, and CSS
├── tsconfig.json                      # Strict TypeScript configuration
├── vitest.config.ts                   # Node unit/component test configuration
├── scripts/
│   └── generate-resume-types.mjs      # Generate Resume types from the pinned official schema
├── src/
│   ├── env.d.ts                       # Astro client type reference
│   ├── pages/
│   │   ├── index.astro                # Temporary gate index, not the final landing page
│   │   └── feasibility/[template]/[fixture].astro
│   ├── resume/
│   │   └── domain/
│   │       ├── generated/resume.ts    # Generated, never hand-edited
│   │       └── formatting.ts          # Pure date/location formatting
│   ├── resume-fixtures/
│   │   └── resumes.ts                 # Short, complete, and long gate fixtures
│   ├── resume-editor/
│   │   ├── domain/validation-result.ts
│   │   ├── application/ports/resume-validator.ts
│   │   └── adapters/validation/ajv-resume-validator.ts
│   ├── resume-templates/
│   │   ├── domain/resume-template.ts
│   │   ├── shared/ResumeDocument.tsx
│   │   ├── editorial/EditorialTemplate.tsx
│   │   ├── minimal/MinimalTemplate.tsx
│   │   ├── professional/ProfessionalTemplate.tsx
│   │   ├── template-registry.ts
│   │   └── template.css
│   └── shared/styles/global.css
├── tests/
│   ├── unit/
│   │   ├── resume-validator.test.ts
│   │   ├── formatting.test.ts
│   │   └── resume-document.test.tsx
│   └── pdf/
│       ├── extract-pdf.ts
│       └── pdf-feasibility.spec.ts
└── docs/quality/
    └── pdf-feasibility-result.md       # Created only after automated and manual acceptance
```

### Task 1: Bootstrap the Static Test Harness

**Files:**

- Create: `.gitignore`
- Create: `.nvmrc`
- Create: `package.json`
- Create: `astro.config.mjs`
- Create: `tsconfig.json`
- Create: `prettier.config.mjs`
- Create: `vitest.config.ts`
- Create: `src/env.d.ts`
- Create: `src/pages/index.astro`

**Interfaces:**

- Consumes: Node.js `>=22.12.0`; the current environment is `v24.15.0` with npm `11.12.1`.
- Produces: `npm run build`, `npm test`, and a static Astro route at `/`.

- [ ] **Step 1: Initialize version control and verify the runtime**

Run:

```bash
git init
node --version
npm --version
```

Expected: Git initializes successfully; Node prints `v24.15.0`; npm prints `11.12.1`.

- [ ] **Step 2: Create the project manifest**

Create `package.json`:

```json
{
  "name": "json-cv",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "dev": "astro dev",
    "build": "astro check && astro build",
    "preview": "astro preview",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "dependencies": {
    "@astrojs/react": "6.0.1",
    "@jsonresume/schema": "1.3.0",
    "ajv": "8.20.0",
    "ajv-formats": "3.0.1",
    "astro": "7.0.9",
    "react": "19.2.7",
    "react-dom": "19.2.7"
  },
  "devDependencies": {
    "@astrojs/check": "0.9.9",
    "@playwright/test": "1.61.1",
    "@types/node": "26.1.1",
    "@types/react": "19.2.17",
    "@types/react-dom": "19.2.3",
    "json-schema-to-typescript": "15.0.4",
    "pdfjs-dist": "6.1.200",
    "prettier": "3.9.5",
    "prettier-plugin-astro": "0.14.1",
    "typescript": "5.9.3",
    "vitest": "4.1.10"
  }
}
```

- [ ] **Step 3: Create strict framework configuration**

Create `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import react from "@astrojs/react";

export default defineConfig({
  output: "static",
  integrations: [react()],
});
```

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
  },
});
```

Create `prettier.config.mjs`:

```js
export default {
  plugins: ["prettier-plugin-astro"],
  overrides: [{ files: "*.astro", options: { parser: "astro" } }],
};
```

Create `.nvmrc`:

```text
24.15.0
```

Create `src/env.d.ts`:

```ts
/// <reference types="astro/client" />
```

- [ ] **Step 4: Create the temporary feasibility index**

Create `src/pages/index.astro`:

```astro
---
const fixtures = ["short", "complete", "long"];
const templates = ["editorial", "minimal", "professional"];
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>JSON CV PDF feasibility</title>
  </head>
  <body>
    <main>
      <h1>PDF feasibility fixtures</h1>
      <p>This route is a technical harness, not the product landing page.</p>
      <ul>
        {
          templates.flatMap((template) =>
            fixtures.map((fixture) => (
              <li>
                <a href={`/feasibility/${template}/${fixture}`}>
                  {template} / {fixture}
                </a>
              </li>
            )),
          )
        }
      </ul>
    </main>
  </body>
</html>
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.astro/
.superpowers/
playwright-report/
test-results/
*.pdf
.DS_Store
```

- [ ] **Step 5: Install and verify the empty static application**

Run:

```bash
npm install
npm test
npm run build
```

Expected: npm creates `package-lock.json`; Vitest exits successfully with no tests; Astro check reports no errors; Astro builds `/index.html` into `dist/`.

- [ ] **Step 6: Commit the bootstrap and approved documents**

```bash
git add .gitignore .nvmrc package.json package-lock.json astro.config.mjs tsconfig.json prettier.config.mjs vitest.config.ts src/env.d.ts src/pages/index.astro docs/superpowers
git commit -m "chore: bootstrap static pdf feasibility harness"
```

### Task 2: Establish the Official Schema Boundary

**Files:**

- Create: `scripts/generate-resume-types.mjs`
- Create: `src/resume/domain/generated/resume.ts` through the generator
- Create: `src/resume-editor/domain/validation-result.ts`
- Create: `src/resume-editor/application/ports/resume-validator.ts`
- Create: `src/resume-editor/adapters/validation/ajv-resume-validator.ts`
- Create: `tests/unit/resume-validator.test.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: `@jsonresume/schema/schema.json` version `1.3.0`.
- Produces: `Resume`, `ResumeValidationResult`, `ResumeValidator`, and `AjvResumeValidator.validate(candidate: unknown)`.

- [ ] **Step 1: Write failing validator contract tests**

Create `tests/unit/resume-validator.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";

describe("AjvResumeValidator", () => {
  const validator = new AjvResumeValidator();

  it("accepts a resume matching the pinned official schema", () => {
    const result = validator.validate({
      basics: { name: "Alex Morgan", email: "alex@example.com" },
      work: [{ name: "Acme", startDate: "2022-03" }],
    });

    expect(result.ok).toBe(true);
  });

  it("returns every schema diagnostic with a JSON path", () => {
    const result = validator.validate({
      basics: { email: "not-an-email" },
      work: [{ startDate: "March 2022" }],
    });

    expect(result).toEqual({
      ok: false,
      diagnostics: expect.arrayContaining([
        expect.objectContaining({ path: "/basics/email", keyword: "format" }),
        expect.objectContaining({
          path: "/work/0/startDate",
          keyword: "pattern",
        }),
      ]),
    });
  });
});
```

- [ ] **Step 2: Run the tests to verify the boundary is missing**

Run:

```bash
npm test -- tests/unit/resume-validator.test.ts
```

Expected: FAIL because `AjvResumeValidator` does not exist.

- [ ] **Step 3: Add deterministic type generation**

Create `scripts/generate-resume-types.mjs`:

```js
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "json-schema-to-typescript";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = require.resolve("@jsonresume/schema/schema.json");
const outputPath = resolve(root, "src/resume/domain/generated/resume.ts");
const schema = JSON.parse(await readFile(schemaPath, "utf8"));
const source = await compile({ ...schema, title: "Resume" }, "Resume", {
  bannerComment:
    "/* Generated from @jsonresume/schema@1.3.0. Do not edit manually. */",
  additionalProperties: true,
  style: { singleQuote: false, semi: true, tabWidth: 2 },
});

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, source, "utf8");
```

Modify `package.json` scripts:

```json
{
  "scripts": {
    "generate:types": "node scripts/generate-resume-types.mjs",
    "build": "npm run generate:types && astro check && astro build"
  }
}
```

Run:

```bash
npm run generate:types
```

Expected: `src/resume/domain/generated/resume.ts` exports `Resume` and starts with the generated-file warning.

- [ ] **Step 4: Implement the port and AJV adapter**

Create `src/resume-editor/domain/validation-result.ts`:

```ts
import type { Resume } from "../../resume/domain/generated/resume";

export type ValidationDiagnostic = {
  path: string;
  keyword: string;
  message: string;
};

export type ResumeValidationResult =
  | { ok: true; value: Resume }
  | { ok: false; diagnostics: ValidationDiagnostic[] };
```

Create `src/resume-editor/application/ports/resume-validator.ts`:

```ts
import type { ResumeValidationResult } from "../../domain/validation-result";

export interface ResumeValidator {
  validate(candidate: unknown): ResumeValidationResult;
}
```

Create `src/resume-editor/adapters/validation/ajv-resume-validator.ts`:

```ts
import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import addFormats from "ajv-formats";
import resumeSchema from "@jsonresume/schema/schema.json";
import type { Resume } from "../../../resume/domain/generated/resume";
import type { ResumeValidator } from "../../application/ports/resume-validator";
import type {
  ResumeValidationResult,
  ValidationDiagnostic,
} from "../../domain/validation-result";

const toDiagnostic = (error: ErrorObject): ValidationDiagnostic => ({
  path: error.instancePath || "/",
  keyword: error.keyword,
  message: error.message ?? "Invalid value",
});

export class AjvResumeValidator implements ResumeValidator {
  private readonly validateSchema: ValidateFunction<Resume>;

  constructor() {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    this.validateSchema = ajv.compile<Resume>(resumeSchema);
  }

  validate(candidate: unknown): ResumeValidationResult {
    if (this.validateSchema(candidate)) {
      return { ok: true, value: candidate };
    }

    return {
      ok: false,
      diagnostics: (this.validateSchema.errors ?? []).map(toDiagnostic),
    };
  }
}
```

- [ ] **Step 5: Run focused and full verification**

Run:

```bash
npm test -- tests/unit/resume-validator.test.ts
npm run build
```

Expected: both validator tests pass; type generation and Astro build succeed.

- [ ] **Step 6: Commit the schema boundary**

```bash
git add package.json package-lock.json scripts/generate-resume-types.mjs src/resume src/resume-editor tests/unit/resume-validator.test.ts
git commit -m "feat: establish json resume schema boundary"
```

### Task 3: Build the Semantic Resume Document

**Files:**

- Create: `src/resume-fixtures/resumes.ts`
- Create: `src/resume/domain/formatting.ts`
- Create: `tests/unit/formatting.test.ts`
- Create: `src/resume-templates/shared/ResumeDocument.tsx`
- Create: `tests/unit/resume-document.test.tsx`
- Modify: `tests/unit/resume-validator.test.ts`

**Interfaces:**

- Consumes: generated `Resume`.
- Produces: `formatDateRange(startDate, endDate)`, `formatLocation(location)`, and `ResumeDocument({ resume })` with a linear semantic DOM.

- [ ] **Step 1: Add valid short, complete, and long fixtures**

Create `src/resume-fixtures/resumes.ts`:

```ts
import type { Resume } from "../resume/domain/generated/resume";

export const shortResume: Resume = {
  basics: {
    name: "Alex Morgan",
    label: "Senior Frontend Engineer",
    email: "alex@example.com",
    url: "https://example.com",
    summary: "Frontend engineer focused on accessible, resilient products.",
    location: { city: "Madrid", countryCode: "ES" },
  },
  work: [
    {
      name: "Acme",
      position: "Senior Frontend Engineer",
      startDate: "2022-03",
      summary: "Builds the customer-facing platform.",
      highlights: ["Improved Core Web Vitals across the product."],
    },
  ],
  skills: [
    { name: "Frontend", keywords: ["TypeScript", "React", "Accessibility"] },
  ],
};

export const completeResume: Resume = {
  $schema:
    "https://raw.githubusercontent.com/jsonresume/resume-schema/master/schema.json",
  basics: {
    name: "Alex Morgan",
    label: "Senior Frontend Engineer",
    image: "https://example.com/photo.png",
    email: "alex@example.com",
    phone: "+34 600 000 000",
    url: "https://example.com",
    summary:
      "Frontend engineer with seven years of experience building accessible products.",
    location: {
      address: "Calle Mayor 1",
      postalCode: "28001",
      city: "Madrid",
      region: "Madrid",
      countryCode: "ES",
    },
    profiles: [
      {
        network: "LinkedIn",
        username: "alex",
        url: "https://linkedin.com/in/alex",
      },
    ],
  },
  work: [
    {
      name: "Acme",
      location: "Madrid",
      position: "Senior Frontend Engineer",
      url: "https://example.com/acme",
      startDate: "2022-03",
      summary: "Leads frontend architecture.",
      highlights: ["Reduced load time by 40%.", "Mentored six engineers."],
    },
  ],
  volunteer: [
    {
      organization: "Open Web Foundation",
      position: "Mentor",
      url: "https://example.com/foundation",
      startDate: "2021",
      summary: "Mentors junior developers.",
      highlights: ["Delivered twelve workshops."],
    },
  ],
  education: [
    {
      institution: "Technical University",
      url: "https://example.com/university",
      area: "Computer Science",
      studyType: "BSc",
      startDate: "2012",
      endDate: "2016",
      score: "8.7/10",
      courses: ["Distributed Systems", "Human Computer Interaction"],
    },
  ],
  awards: [
    {
      title: "Accessibility Champion",
      date: "2024",
      awarder: "Web Guild",
      summary: "Recognized for accessible product leadership.",
    },
  ],
  certificates: [
    {
      name: "Web Accessibility Specialist",
      date: "2023-04",
      issuer: "IAAP",
      url: "https://example.com/certificate",
    },
  ],
  publications: [
    {
      name: "Design Systems at Scale",
      publisher: "Frontend Journal",
      releaseDate: "2023-09",
      url: "https://example.com/article",
      summary: "A practical guide to federated design systems.",
    },
  ],
  skills: [
    {
      name: "Frontend",
      level: "Expert",
      keywords: ["TypeScript", "React", "CSS", "Accessibility"],
    },
  ],
  languages: [
    { language: "Spanish", fluency: "Native" },
    { language: "English", fluency: "Professional" },
  ],
  interests: [
    { name: "Open source", keywords: ["Web standards", "Developer tools"] },
  ],
  references: [
    {
      name: "Jordan Lee",
      reference: "Alex consistently delivers clear, maintainable systems.",
    },
  ],
  projects: [
    {
      name: "Accessible UI Kit",
      description: "An open-source component library.",
      highlights: ["Used by four product teams."],
      keywords: ["React", "ARIA"],
      startDate: "2021",
      endDate: "2024",
      url: "https://example.com/ui-kit",
      roles: ["Maintainer"],
      entity: "Open Web Foundation",
      type: "open-source",
    },
  ],
  meta: {
    canonical: "https://example.com/resume.json",
    version: "v1.0.0",
    lastModified: "2026-07-14T10:00:00",
  },
};

const baseWork = completeResume.work?.[0];
if (!baseWork) throw new Error("Complete fixture requires one work entry");

export const longResume: Resume = {
  ...completeResume,
  basics: {
    ...completeResume.basics,
    summary: `${completeResume.basics?.summary} ${"Detailed professional summary. ".repeat(8)}`,
  },
  work: Array.from({ length: 14 }, (_, index) => ({
    ...baseWork,
    name: `Company ${String(index + 1).padStart(2, "0")}`,
    startDate: `${2010 + index}`,
    endDate: `${2011 + index}`,
    highlights: Array.from(
      { length: index === 0 ? 45 : 5 },
      (__, highlight) =>
        `Delivered measurable result ${highlight + 1} for engagement ${index + 1}.`,
    ),
  })),
};
```

Append to `tests/unit/resume-validator.test.ts`:

```ts
import {
  completeResume,
  longResume,
  shortResume,
} from "../../src/resume-fixtures/resumes";

it.each([
  ["short", shortResume],
  ["complete", completeResume],
  ["long", longResume],
])("accepts the %s feasibility fixture", (_name, resume) => {
  const fixtureValidator = new AjvResumeValidator();
  expect(fixtureValidator.validate(resume).ok).toBe(true);
});
```

Run `npm test -- tests/unit/resume-validator.test.ts`.

Expected: all three gate fixtures pass the pinned official schema.

- [ ] **Step 2: Write failing pure-formatting tests**

Create `tests/unit/formatting.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  formatDateRange,
  formatLocation,
} from "../../src/resume/domain/formatting";

describe("resume formatting", () => {
  it("formats open and closed date ranges without inventing dates", () => {
    expect(formatDateRange("2022-03", undefined)).toBe("2022-03 – Present");
    expect(formatDateRange("2019", "2022-02")).toBe("2019 – 2022-02");
    expect(formatDateRange(undefined, undefined)).toBe("");
  });

  it("joins only populated location parts", () => {
    expect(
      formatLocation({ city: "Madrid", region: "Madrid", countryCode: "ES" }),
    ).toBe("Madrid, Madrid, ES");
  });
});
```

Run `npm test -- tests/unit/formatting.test.ts`.

Expected: FAIL because `formatting.ts` does not exist.

- [ ] **Step 3: Implement pure formatting**

Create `src/resume/domain/formatting.ts`:

```ts
import type { Resume } from "./generated/resume";

type Location = NonNullable<NonNullable<Resume["basics"]>["location"]>;

export const formatDateRange = (
  startDate?: string,
  endDate?: string,
): string => {
  if (!startDate && !endDate) return "";
  if (!startDate) return endDate ?? "";
  return `${startDate} – ${endDate || "Present"}`;
};

export const formatLocation = (location?: Location): string =>
  [location?.city, location?.region, location?.countryCode]
    .filter(Boolean)
    .join(", ");
```

Run `npm test -- tests/unit/formatting.test.ts`.

Expected: both tests pass.

- [ ] **Step 4: Write the failing semantic document contract test**

Create `tests/unit/resume-document.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ResumeDocument } from "../../src/resume-templates/shared/ResumeDocument";
import { completeResume, shortResume } from "../../src/resume-fixtures/resumes";

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
```

Run `npm test -- tests/unit/resume-document.test.tsx`.

Expected: FAIL because `ResumeDocument` does not exist.

- [ ] **Step 5: Implement the complete semantic renderer**

Create `src/resume-templates/shared/ResumeDocument.tsx`:

```tsx
import type { ReactNode } from "react";
import {
  formatDateRange,
  formatLocation,
} from "../../resume/domain/formatting";
import type { Resume } from "../../resume/domain/generated/resume";

type Props = { resume: Resume };
type SectionProps = { title: string; children: ReactNode };

const Section = ({ title, children }: SectionProps) => (
  <section>
    <h2>{title}</h2>
    {children}
  </section>
);
const List = ({ items }: { items: string[] | undefined }) =>
  items?.length ? (
    <ul>
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  ) : null;
const Link = ({
  url,
  children,
}: {
  url: string | undefined;
  children: ReactNode;
}) => (url ? <a href={url}>{children}</a> : <>{children}</>);
const Entry = ({ children }: { children: ReactNode }) => (
  <article className="resume-entry" data-entry>
    {children}
  </article>
);

export function ResumeDocument({ resume }: Props) {
  const { basics } = resume;
  return (
    <article className="resume-document" data-resume-document>
      <header>
        <h1>{basics?.name}</h1>
        {basics?.label && <p className="resume-label">{basics.label}</p>}
        <address>
          {[formatLocation(basics?.location), basics?.phone]
            .filter(Boolean)
            .map((value) => (
              <span key={value}>{value}</span>
            ))}
          {basics?.email && (
            <a href={`mailto:${basics.email}`}>{basics.email}</a>
          )}
          {basics?.url && <a href={basics.url}>{basics.url}</a>}
          {basics?.profiles?.map((profile) => (
            <Link key={profile.url ?? profile.network} url={profile.url}>
              {profile.network}: {profile.username}
            </Link>
          ))}
        </address>
      </header>

      {basics?.summary && (
        <Section title="Profile">
          <p>{basics.summary}</p>
        </Section>
      )}

      {!!resume.work?.length && (
        <Section title="Experience">
          {resume.work.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <h3>
                {item.position} · <Link url={item.url}>{item.name}</Link>
              </h3>
              <p className="entry-meta">
                {[formatDateRange(item.startDate, item.endDate), item.location]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {item.summary && <p>{item.summary}</p>}
              <List items={item.highlights} />
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.volunteer?.length && (
        <Section title="Volunteer">
          {resume.volunteer.map((item, index) => (
            <Entry key={`${item.organization}-${index}`}>
              <h3>
                {item.position} ·{" "}
                <Link url={item.url}>{item.organization}</Link>
              </h3>
              <p className="entry-meta">
                {formatDateRange(item.startDate, item.endDate)}
              </p>
              {item.summary && <p>{item.summary}</p>}
              <List items={item.highlights} />
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.education?.length && (
        <Section title="Education">
          {resume.education.map((item, index) => (
            <Entry key={`${item.institution}-${index}`}>
              <h3>
                {item.studyType} {item.area} ·{" "}
                <Link url={item.url}>{item.institution}</Link>
              </h3>
              <p className="entry-meta">
                {formatDateRange(item.startDate, item.endDate)}
                {item.score ? ` · ${item.score}` : ""}
              </p>
              <List items={item.courses} />
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.awards?.length && (
        <Section title="Awards">
          {resume.awards.map((item, index) => (
            <Entry key={`${item.title}-${index}`}>
              <h3>{item.title}</h3>
              <p className="entry-meta">
                {[item.awarder, item.date].filter(Boolean).join(" · ")}
              </p>
              {item.summary && <p>{item.summary}</p>}
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.certificates?.length && (
        <Section title="Certificates">
          {resume.certificates.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <h3>
                <Link url={item.url}>{item.name}</Link>
              </h3>
              <p className="entry-meta">
                {[item.issuer, item.date].filter(Boolean).join(" · ")}
              </p>
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.publications?.length && (
        <Section title="Publications">
          {resume.publications.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <h3>
                <Link url={item.url}>{item.name}</Link>
              </h3>
              <p className="entry-meta">
                {[item.publisher, item.releaseDate].filter(Boolean).join(" · ")}
              </p>
              {item.summary && <p>{item.summary}</p>}
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.skills?.length && (
        <Section title="Skills">
          {resume.skills.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <h3>
                {item.name}
                {item.level ? ` · ${item.level}` : ""}
              </h3>
              {item.keywords?.length ? (
                <p>{item.keywords.join(" · ")}</p>
              ) : null}
            </Entry>
          ))}
        </Section>
      )}

      {!!resume.languages?.length && (
        <Section title="Languages">
          {resume.languages.map((item, index) => (
            <p key={`${item.language}-${index}`}>
              <strong>{item.language}</strong>
              {item.fluency ? ` · ${item.fluency}` : ""}
            </p>
          ))}
        </Section>
      )}

      {!!resume.interests?.length && (
        <Section title="Interests">
          {resume.interests.map((item, index) => (
            <p key={`${item.name}-${index}`}>
              <strong>{item.name}</strong>
              {item.keywords?.length ? ` · ${item.keywords.join(" · ")}` : ""}
            </p>
          ))}
        </Section>
      )}

      {!!resume.references?.length && (
        <Section title="References">
          {resume.references.map((item, index) => (
            <blockquote key={`${item.name}-${index}`}>
              <p>{item.reference}</p>
              <cite>{item.name}</cite>
            </blockquote>
          ))}
        </Section>
      )}

      {!!resume.projects?.length && (
        <Section title="Projects">
          {resume.projects.map((item, index) => (
            <Entry key={`${item.name}-${index}`}>
              <h3>
                <Link url={item.url}>{item.name}</Link>
              </h3>
              <p className="entry-meta">
                {[
                  formatDateRange(item.startDate, item.endDate),
                  item.entity,
                  item.type,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {item.description && <p>{item.description}</p>}
              <List items={item.highlights} />
              {item.roles?.length ? (
                <p>
                  <strong>Roles:</strong> {item.roles.join(", ")}
                </p>
              ) : null}
              {item.keywords?.length ? (
                <p>
                  <strong>Keywords:</strong> {item.keywords.join(", ")}
                </p>
              ) : null}
            </Entry>
          ))}
        </Section>
      )}
    </article>
  );
}
```

- [ ] **Step 6: Verify schema coverage and semantic rendering**

Run:

```bash
npm test -- tests/unit/formatting.test.ts tests/unit/resume-document.test.tsx
npm test
npm run build
```

Expected: all unit tests pass; complete fixture renders all twelve human-facing sections in order; build succeeds.

- [ ] **Step 7: Commit the semantic resume document**

```bash
git add src/resume/domain/formatting.ts src/resume-fixtures/resumes.ts src/resume-templates/shared/ResumeDocument.tsx tests/unit/formatting.test.ts tests/unit/resume-document.test.tsx tests/unit/resume-validator.test.ts
git commit -m "feat: render complete semantic resume document"
```

### Task 4: Add Three Templates and A4 Print Routes

**Files:**

- Create: `src/resume-templates/domain/resume-template.ts`
- Create: `src/resume-templates/editorial/EditorialTemplate.tsx`
- Create: `src/resume-templates/minimal/MinimalTemplate.tsx`
- Create: `src/resume-templates/professional/ProfessionalTemplate.tsx`
- Create: `src/resume-templates/template-registry.ts`
- Create: `src/resume-templates/template.css`
- Create: `src/shared/styles/global.css`
- Create: `src/pages/feasibility/[template]/[fixture].astro`
- Modify: `tests/unit/resume-document.test.tsx`

**Interfaces:**

- Consumes: `ResumeDocument`, `shortResume`, `completeResume`, and `longResume`.
- Produces: `TemplateId`, `ResumeTemplateComponent`, `templateRegistry`, and nine static feasibility URLs.

- [ ] **Step 1: Write the failing template-registry contract test**

Append to `tests/unit/resume-document.test.tsx`:

```tsx
import { templateRegistry } from "../../src/resume-templates/template-registry";

it("all registered templates render the same semantic resume", () => {
  for (const [templateId, Template] of Object.entries(templateRegistry)) {
    const html = renderToStaticMarkup(<Template resume={completeResume} />);
    expect(html, templateId).toContain("Alex Morgan");
    expect(html, templateId).toContain("Projects");
    expect(html, templateId).toContain("Accessible UI Kit");
  }
});
```

Run `npm test -- tests/unit/resume-document.test.tsx`.

Expected: FAIL because `template-registry` does not exist.

- [ ] **Step 2: Write the template contract and adapters**

Create `src/resume-templates/domain/resume-template.ts`:

```ts
import type { ComponentType } from "react";
import type { Resume } from "../../resume/domain/generated/resume";

export const templateIds = ["editorial", "minimal", "professional"] as const;
export type TemplateId = (typeof templateIds)[number];
export type ResumeTemplateProps = { resume: Resume };
export type ResumeTemplateComponent = ComponentType<ResumeTemplateProps>;
```

Create `src/resume-templates/editorial/EditorialTemplate.tsx`:

```tsx
import type { ResumeTemplateProps } from "../domain/resume-template";
import { ResumeDocument } from "../shared/ResumeDocument";

export const EditorialTemplate = ({ resume }: ResumeTemplateProps) => (
  <div className="resume-page theme-editorial">
    <ResumeDocument resume={resume} />
  </div>
);
```

Create `src/resume-templates/minimal/MinimalTemplate.tsx`:

```tsx
import type { ResumeTemplateProps } from "../domain/resume-template";
import { ResumeDocument } from "../shared/ResumeDocument";

export const MinimalTemplate = ({ resume }: ResumeTemplateProps) => (
  <div className="resume-page theme-minimal">
    <ResumeDocument resume={resume} />
  </div>
);
```

Create `src/resume-templates/professional/ProfessionalTemplate.tsx`:

```tsx
import type { ResumeTemplateProps } from "../domain/resume-template";
import { ResumeDocument } from "../shared/ResumeDocument";

export const ProfessionalTemplate = ({ resume }: ResumeTemplateProps) => (
  <div className="resume-page theme-professional">
    <ResumeDocument resume={resume} />
  </div>
);
```

Create `src/resume-templates/template-registry.ts`:

```ts
import { EditorialTemplate } from "./editorial/EditorialTemplate";
import { MinimalTemplate } from "./minimal/MinimalTemplate";
import { ProfessionalTemplate } from "./professional/ProfessionalTemplate";
import type {
  ResumeTemplateComponent,
  TemplateId,
} from "./domain/resume-template";

export const templateRegistry: Record<TemplateId, ResumeTemplateComponent> = {
  editorial: EditorialTemplate,
  minimal: MinimalTemplate,
  professional: ProfessionalTemplate,
};
```

- [ ] **Step 3: Implement shared screen and print styling**

Create `src/shared/styles/global.css`:

```css
:root {
  font-family: Arial, Helvetica, sans-serif;
  color: #172033;
  background: #e9edf2;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
}
a {
  color: inherit;
  text-decoration-thickness: 0.08em;
  text-underline-offset: 0.12em;
}
.feasibility-toolbar {
  position: sticky;
  top: 0;
  z-index: 2;
  padding: 0.75rem 1rem;
  color: white;
  background: #172033;
}
.preview-surface {
  padding: 2rem;
}
```

Create `src/resume-templates/template.css`:

```css
@page {
  size: A4;
  margin: 14mm 15mm 16mm;
}

.resume-page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 14mm 15mm 16mm;
  color: #172033;
  background: white;
  box-shadow: 0 12px 36px rgb(15 23 42 / 12%);
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
.resume-document {
  font-size: 10pt;
  line-height: 1.42;
}
.resume-document h1 {
  margin: 0;
  font-size: 24pt;
  line-height: 1.05;
}
.resume-label {
  margin: 0.3rem 0 0.6rem;
  font-size: 12pt;
}
.resume-document address {
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem 0.75rem;
  font-style: normal;
}
.resume-document section {
  margin-top: 1rem;
}
.resume-document h2 {
  margin: 0 0 0.45rem;
  padding-bottom: 0.18rem;
  font-size: 10pt;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  border-bottom: 1px solid currentColor;
  break-after: avoid;
}
.resume-document h3 {
  margin: 0;
  font-size: 10.5pt;
  break-after: avoid;
}
.resume-document p {
  margin: 0.22rem 0;
}
.resume-document ul {
  margin: 0.25rem 0;
  padding-left: 1.15rem;
}
.resume-entry {
  margin-top: 0.55rem;
  break-inside: avoid;
}
.entry-meta {
  color: #4b5563;
}
.resume-document blockquote {
  margin: 0.5rem 0;
  padding-left: 0.75rem;
  border-left: 2px solid currentColor;
  break-inside: avoid;
}

.theme-editorial {
  border-top: 5mm solid #163c64;
}
.theme-editorial h1,
.theme-editorial h2 {
  color: #163c64;
}
.theme-minimal {
  font-family: Arial, Helvetica, sans-serif;
}
.theme-minimal h2 {
  color: #111827;
  border-bottom-width: 1px;
}
.theme-professional {
  font-family: Georgia, "Times New Roman", serif;
}
.theme-professional h1 {
  color: #303b4f;
}
.theme-professional h2 {
  color: #303b4f;
  border-bottom: 2px solid #8793a5;
}

@media print {
  :root,
  body {
    color: #172033;
    background: white;
  }
  .feasibility-toolbar {
    display: none !important;
  }
  .preview-surface {
    padding: 0;
  }
  .resume-page {
    width: auto;
    min-height: 0;
    margin: 0;
    padding: 0;
    box-shadow: none;
  }
}

@media screen and (max-width: 800px) {
  .preview-surface {
    padding: 0.75rem;
    overflow-x: auto;
  }
  .resume-page {
    transform-origin: top left;
  }
}
```

- [ ] **Step 4: Create all static feasibility routes**

Create `src/pages/feasibility/[template]/[fixture].astro`:

```astro
---
import "../../../shared/styles/global.css";
import "../../../resume-templates/template.css";
import {
  templateIds,
  type TemplateId,
} from "../../../resume-templates/domain/resume-template";
import { templateRegistry } from "../../../resume-templates/template-registry";
import {
  completeResume,
  longResume,
  shortResume,
} from "../../../resume-fixtures/resumes";
import type { Resume } from "../../../resume/domain/generated/resume";

const fixtureRegistry = {
  short: shortResume,
  complete: completeResume,
  long: longResume,
} satisfies Record<string, Resume>;
type FixtureId = keyof typeof fixtureRegistry;

export function getStaticPaths() {
  return templateIds.flatMap((template) =>
    (Object.keys(fixtureRegistry) as FixtureId[]).map((fixture) => ({
      params: { template, fixture },
      props: { template, fixture },
    })),
  );
}

type Props = { template: TemplateId; fixture: FixtureId };
const { template, fixture } = Astro.props;
const Template = templateRegistry[template];
const resume = fixtureRegistry[fixture];
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <title>{template} / {fixture} PDF fixture</title>
  </head>
  <body>
    <nav class="feasibility-toolbar">
      <a href="/">Fixtures</a> · {template} · {fixture}
    </nav>
    <main
      class="preview-surface"
      data-template={template}
      data-fixture={fixture}
    >
      <Template resume={resume} />
    </main>
  </body>
</html>
```

- [ ] **Step 5: Build all nine routes and run the registry contract**

Run:

```bash
npm run build
npm test -- tests/unit/resume-document.test.tsx
```

Expected: Astro reports all nine combinations under `/feasibility/editorial`, `/feasibility/minimal`, and `/feasibility/professional`, plus `/index.html`, with no type errors; every registry contract assertion passes.

- [ ] **Step 6: Manually smoke-test screen and print media**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:4321/feasibility/editorial/complete`, verify all sections appear in one column, then open Chrome print preview and verify only the resume appears on A4 pages.

Expected: toolbar and gray preview background are absent from print preview; text remains visible and no section uses two columns.

- [ ] **Step 7: Commit templates and routes**

```bash
git add src/pages src/resume-templates src/shared/styles tests/unit/resume-document.test.tsx
git commit -m "feat: add ats-safe a4 resume templates"
```

### Task 5: Automate the Chromium PDF Contract

**Files:**

- Create: `playwright.config.ts`
- Create: `tests/pdf/extract-pdf.ts`
- Create: `tests/pdf/pdf-feasibility.spec.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: nine static feasibility routes.
- Produces: `extractPdf(buffer)` returning page text and link targets, plus `npm run test:pdf`.

- [ ] **Step 1: Configure deterministic Chromium tests**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/pdf",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:4321",
    ...devices["Desktop Chrome"],
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://127.0.0.1:4321",
    reuseExistingServer: !process.env.CI,
  },
  reporter: [["list"]],
});
```

Modify `package.json` scripts:

```json
{
  "scripts": {
    "test:pdf": "playwright test",
    "test:all": "npm test && npm run test:pdf && npm run build"
  }
}
```

Run:

```bash
npx playwright install chromium
```

Expected: Playwright installs its pinned Chromium build.

- [ ] **Step 2: Write the failing PDF acceptance tests**

Create `tests/pdf/pdf-feasibility.spec.ts`:

```ts
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

    expect(result.pageTexts.every((pageText) => pageText.length > 0)).toBe(
      true,
    );
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    expect(text).not.toContain("photo.png");
    expect(text).not.toContain("canonical");
    expect(result.links).toContain("https://example.com/ui-kit");
    expect(repeatedResult).toEqual(result);
  });

  test(`${template}: long resume paginates without blank pages or missing entries`, async ({
    page,
  }) => {
    const pdf = await createPdf(page, `/feasibility/${template}/long`);
    const result = await extractPdf(pdf);
    const text = result.pageTexts.join(" ");

    expect(result.pageTexts.length).toBeGreaterThanOrEqual(3);
    expect(result.pageTexts.every((pageText) => pageText.length > 40)).toBe(
      true,
    );
    for (let index = 1; index <= 14; index += 1) {
      expect(text).toContain(`Company ${String(index).padStart(2, "0")}`);
    }
    expect(text).toContain("Delivered measurable result 45 for engagement 1");
  });
}
```

Run:

```bash
npm run test:pdf
```

Expected: FAIL because `tests/pdf/extract-pdf.ts` does not exist.

- [ ] **Step 3: Create the PDF text and annotation extractor**

Create `tests/pdf/extract-pdf.ts`:

```ts
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

type PdfExtraction = {
  pageTexts: string[];
  links: string[];
};

export async function extractPdf(buffer: Buffer): Promise<PdfExtraction> {
  const document = await getDocument({ data: new Uint8Array(buffer) }).promise;
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

  await document.destroy();
  return { pageTexts, links };
}
```

- [ ] **Step 4: Run tests and inspect any genuine print failures**

Run:

```bash
npm run test:pdf
```

Expected: all nine tests pass. If a concrete template or pagination defect fails, do not weaken page count, content, ordering, determinism, or link assertions. Fix only the responsible semantic markup or print CSS, then rerun this exact command until all nine tests pass.

- [ ] **Step 5: Run the complete automated gate**

Run:

```bash
npm run format
npm run test:all
git diff --check
```

Expected: unit tests pass, nine PDF tests pass, Astro check/build passes, and `git diff --check` prints no errors.

- [ ] **Step 6: Commit automated PDF verification**

```bash
git add package.json package-lock.json playwright.config.ts tests/pdf src
git commit -m "test: verify chromium pdf contract"
```

### Task 6: Execute the Native Chrome Gate and Record the Decision

**Files:**

- Create after a successful gate: `docs/quality/pdf-feasibility-result.md`

**Interfaces:**

- Consumes: passing `npm run test:all` and Chrome's native print dialog.
- Produces: an explicit `PASS` decision permitting the separate editor implementation plan.

- [ ] **Step 1: Re-run automated evidence from a clean process**

Run:

```bash
npm ci
npm run test:all
```

Expected: all unit, PDF, type-check, and build checks pass without relying on a previously running development server.

- [ ] **Step 2: Verify every template in native Chrome print preview**

Run `npm run dev -- --host 127.0.0.1`, then inspect these URLs through Chrome's **Print > Save as PDF** flow using A4 and background graphics:

```text
http://127.0.0.1:4321/feasibility/editorial/complete
http://127.0.0.1:4321/feasibility/minimal/complete
http://127.0.0.1:4321/feasibility/professional/complete
http://127.0.0.1:4321/feasibility/editorial/long
http://127.0.0.1:4321/feasibility/minimal/long
http://127.0.0.1:4321/feasibility/professional/long
```

For each output verify: no toolbar, one-column reading order, no clipped or overlapping text, no accidental blank pages, no orphaned section heading, acceptable entry splitting, selectable text, and clickable links.

Expected: all six native outputs satisfy every criterion. If any material criterion fails, stop; do not create a passing report or begin the editor plan.

- [ ] **Step 3: Record a successful gate**

Only after Steps 1 and 2 pass, create `docs/quality/pdf-feasibility-result.md` with exactly:

```markdown
# PDF Feasibility Result

**Status:** PASS
**Scope:** Desktop Chrome/Chromium, A4, JSON Resume Schema 1.3.0

## Automated Evidence

- All unit and semantic rendering tests pass.
- All nine Playwright Chromium PDF tests pass.
- Short fixtures produce one page with selectable text.
- Complete fixtures preserve every human-facing standard section, reading order, and links.
- Long fixtures produce at least three non-empty pages without missing work entries.
- Static Astro type-check and production build pass.

## Native Print Evidence

- All three complete templates were verified through Chrome's native Save as PDF flow.
- All three long templates were verified through Chrome's native Save as PDF flow.
- Output uses one column and contains no clipped, overlapping, missing, or accidental blank content.
- Text is selectable and links remain clickable.

## Decision

The browser-only HTML/CSS print architecture is viable for the MVP. Planning and implementation of the complete editor may proceed. Support remains limited to current stable desktop Chrome/Chromium and A4 output.
```

- [ ] **Step 4: Commit the gate decision**

```bash
git add docs/quality/pdf-feasibility-result.md
git commit -m "docs: record passing pdf feasibility gate"
```

- [ ] **Step 5: Verify repository state**

Run:

```bash
git status --short
git log --oneline -6
```

Expected: working tree is clean and the latest commits correspond to bootstrap, schema boundary, semantic document, templates, PDF verification, and feasibility decision.

## Stop Condition

Do not create the complete editor implementation plan until `docs/quality/pdf-feasibility-result.md` exists with `Status: PASS`. If the gate fails, preserve failing fixtures and test evidence, then return to architecture review to compare a dedicated client PDF engine with pinned server-side Chromium.
