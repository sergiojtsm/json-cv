# JSON Resume ATS PDF Generator: Design Specification

## Status

Approved in collaborative design review on 2026-07-14. The written specification awaits final user review.

## Product Summary

Build an English-language, browser-only application for people who already have a JSON Resume document. A user can import and edit the JSON, validate it against the complete official schema, preview it in three ATS-oriented templates, retain the draft locally, export the edited JSON, and save an A4 PDF through Chromium's print dialog.

The primary value proposition is privacy: resume data stays on the user's device. The MVP has no account, backend, analytics that capture resume content, or server-side PDF generation.

## Success Criterion

A user with a valid JSON Resume can:

1. Import the document.
2. Edit it with immediate syntax and schema feedback.
3. Switch between three templates without changing the source data.
4. Close and reopen the application without losing the local draft.
5. Export the edited JSON.
6. Produce a multipage, selectable-text PDF with a logical reading order without sending resume data over the network.

## Target User

The MVP targets a technical or semi-technical user who already owns a JSON Resume file and is comfortable editing JSON. A form-based editor is intentionally deferred.

## Supported Environment

- The website and editor are responsive on desktop and mobile.
- PDF generation is officially supported on the current stable desktop version of Chrome/Chromium.
- The output format is A4.
- Other browsers may render the editor, but PDF parity is not an MVP guarantee.
- Resume content may use any language. The application interface and landing page use English.

## Architecture

### Runtime Model

Astro produces a fully static site. It renders the SEO-focused landing content and hosts one client-only React island for the editor. All parsing, validation, storage, template selection, rendering, and print initiation happen in the browser.

There are no production API routes or server runtime dependencies.

### Architecture Style

The codebase uses Screaming Architecture with pragmatic Hexagonal Architecture:

- Top-level modules are named after product capabilities such as `resume-editor` and `resume-templates`, not technical categories such as `components` or `services`.
- Domain and application code depend on no UI framework, validator implementation, browser storage, file API, or print API.
- Application ports describe only genuine external boundaries.
- Browser and library integrations implement those ports as adapters.
- React is an inbound UI adapter; Astro composes the static website around it.
- Abstractions are introduced for replaceable boundaries, not for every function or component.

The dependency direction is:

```text
Editor UI -> Editor Application -> Editor Domain + Resume Domain
Editor Adapters -> Editor Application/Resume Domain
Astro -> UI
Templates -> Resume Domain
Resume Domain -> no external technology
```

The intended source organization is:

```text
src/
├── resume/
│   └── domain/
│       ├── generated/
│       └── formatting/
├── resume-editor/
│   ├── domain/
│   ├── application/
│   │   ├── ports/
│   │   └── use-cases/
│   ├── adapters/
│   │   ├── validation/
│   │   ├── persistence/
│   │   └── browser/
│   └── ui/
├── resume-templates/
│   ├── domain/
│   ├── editorial/
│   ├── minimal/
│   ├── professional/
│   └── template-registry.ts
├── pages/
├── layouts/
└── shared/
    └── styles/
```

The `resume` capability owns the generated standard types and pure resume formatting rules shared by editing and rendering. The editor and templates depend on this stable domain contract, not on each other. Astro's required `pages` convention acts only as the composition root. `shared` remains intentionally small; domain-specific helpers stay with the capability that owns them.

### Core Technology Choices

- **Astro static output:** landing pages, metadata, static assets, and editor route.
- **React island:** interactive editor workspace and application state.
- **CodeMirror 6 React integration:** JSON editing, line numbers, syntax highlighting, bracket matching, formatting, and diagnostics.
- **AJV:** validation against a pinned version of the official JSON Resume draft-07 schema, configured to report all errors.
- **JSON Schema type generation:** TypeScript resume types are generated from the same pinned official schema used by AJV.
- **React template components:** controlled semantic HTML output for preview and printing.
- **Browser storage:** versioned `localStorage` record containing the raw draft and selected template.
- **Playwright with Chromium:** automated browser and PDF tests used only during development and CI.

### Source of Truth

The raw editor text is the source of truth for the user's draft. The application derives a second value, `lastValidResume`, only after both JSON parsing and schema validation succeed.

Templates receive only `lastValidResume`. Invalid intermediate edits never reach the render tree, so the preview remains stable while the user fixes errors. The raw draft is still saved locally during invalid edits to prevent data loss.

### Schema and Type Ownership

The pinned official JSON Resume schema is the only resume contract maintained by the project:

```text
Official pinned JSON Schema
        ├── AJV -> runtime validation
        └── type generation -> TypeScript Resume types
```

Generated resume types are not edited manually. Schema upgrades are explicit changes that regenerate types and run the complete fixture and template test suite.

Zod is not used for resume validation. Recreating the external JSON Resume contract in a TypeScript-first schema would duplicate the source of truth and create drift risk. Zod is also excluded from the initial storage implementation; the small versioned storage envelope is checked by a focused parser or an AJV schema rather than introducing a second validation system.

## Major Components

### Static Shell

The Astro shell owns the landing page, SEO metadata, product explanation, privacy statement, supported-browser notice, and the page that mounts the editor island.

### Editor Workspace

The React workspace coordinates:

- JSON import and export.
- CodeMirror document state.
- Parsing and AJV validation.
- Local draft persistence.
- Theme selection.
- Preview rendering.
- Clearing local data.
- Opening the print dialog.

On desktop, the editor and preview are displayed side by side. On narrow screens, they become separate Editor and Preview tabs. PDF generation remains officially supported only on desktop Chromium.

The editor state is managed by a reducer rather than a global state library. Its state includes the raw draft, current validation status, current valid resume, last valid resume, diagnostics, selected template, and persistence status. Explicit events cover draft changes, import outcomes, validation outcomes, restoration, template selection, and local-data clearing. Redux, Zustand, and equivalent global stores are not required for the MVP.

### Application Ports and Adapters

The initial application ports are:

- `ResumeValidator`: validates unknown input and returns a typed validation result.
- `DraftRepository`: loads, saves, and clears the local draft envelope.
- `ResumeFileGateway`: reads imported JSON text and downloads valid JSON.
- `PrintGateway`: initiates browser printing.

The MVP adapters are AJV validation, `localStorage` persistence, browser File/Blob APIs, and `window.print()`. Future PDF-to-JSON, cloud persistence, or server PDF integrations can implement new adapters without changing domain rules or template components.

### Validation Pipeline

Validation has two stages:

1. Parse the editor text as JSON.
2. Validate the parsed object against the pinned official JSON Resume schema.

Syntax errors show a line and column where available. Schema errors show the JSON path and a human-readable message. AJV runs with `allErrors: true`; format support is configured consistently with the pinned schema.

The preview displays the latest valid resume during errors. JSON export and PDF generation are disabled while the current draft is invalid, preventing users from mistaking stale output for the current text.

### Template Contract

Each template is a React component with the conceptual interface:

```ts
type ResumeTemplateProps = {
  resume: Resume;
};
```

All templates must:

- Accept the same complete JSON Resume object.
- Render every populated standard section.
- Omit empty or absent sections.
- Preserve a linear DOM and reading order.
- Use semantic headings, lists, paragraphs, links, and time-related text.
- Render contact details as text rather than icon-only controls.
- Avoid photographs, skill charts, tables used for layout, and multicolumn content.
- Use shared pure formatting helpers for dates, locations, and links without mutating or dropping source data.

The schema's `meta` object is tooling metadata rather than resume content and is therefore validated and preserved but not printed. The optional `basics.image` value is also preserved but not rendered because MVP templates intentionally exclude photographs for ATS safety.

The MVP contains three editorially balanced, single-column templates. They differ in typography, spacing, color, and hierarchy, but not in supported data or reading order. Template switching never modifies the resume JSON.

## Data Flow

### Import

1. The user chooses a local `.json` file.
2. The browser reads it locally as text.
3. The text enters the editor as the new raw draft.
4. Parsing and validation run.
5. The raw imported text is persisted locally whether it is valid or invalid.
6. A valid document updates the preview; an invalid document remains editable and displays actionable errors.

No imported content is uploaded.

### Edit

1. CodeMirror emits the latest text.
2. The raw draft is persisted locally after a short debounce.
3. The validation pipeline runs.
4. Valid data updates `lastValidResume` and all template previews.
5. Invalid data leaves the previous valid preview visible with an explicit stale-preview notice.

### Export JSON

Export is available only for a valid current draft. The application downloads a UTF-8 `.json` file containing the current parsed data, formatted with two-space indentation. Standard data is not transformed or removed.

### Save PDF

1. The user selects a template.
2. The user activates **Save as PDF**.
3. The application invokes `window.print()`.
4. Print CSS hides the application shell and exposes only the selected template.
5. The user chooses **Save as PDF** in Chromium's native dialog.

The MVP does not claim direct one-click file generation because browsers do not expose a standard API for silently saving their native print output.

## Local Persistence and Privacy

The application stores a versioned record under one namespaced `localStorage` key. It contains:

- Raw editor text, including temporarily invalid drafts.
- Selected template identifier.
- Storage format version.

On startup, the editor restores this state and reruns parsing and validation. A visible **Clear local data** action removes the record and resets the workspace after confirmation.

The privacy statement must explain that data remains in the current browser profile and that anyone with access to that profile may see the locally stored draft.

## Print Contract

- Page size is A4 with explicit print margins.
- Preview and print use the same template DOM.
- Print styles hide editor controls, navigation, selectors, and status messages.
- Fonts are local or bundled with the static application; PDF rendering does not depend on remote font availability.
- Text remains selectable and links remain real links.
- Print colors use the relevant browser print-color adjustment while retaining sufficient contrast without backgrounds.
- Experience, education, project, and similar entries use `break-inside: avoid` where practical.
- An individual entry larger than one page may split rather than overflow or disappear.
- Automatic pagination is browser-controlled; the application does not shrink arbitrary content to one page.
- The UI tells the user to select A4 and enable background graphics when required by the chosen template.

## Error Handling

- **Unreadable file:** keep the current draft and show an import error.
- **Invalid JSON syntax:** show location-aware diagnostics and retain the last valid preview.
- **Schema-invalid JSON:** show all useful field-level errors and retain the last valid preview.
- **Unavailable browser storage:** continue in memory, show a non-blocking persistence warning, and keep manual JSON export available.
- **Storage quota failure:** preserve the in-memory draft and advise exporting the JSON.
- **Missing or empty sections:** omit them without leaving empty headings.
- **Print invoked with invalid draft:** disable the action and explain that validation errors must be resolved.
- **Unsupported browser:** allow editing where possible but display that PDF output is only verified on desktop Chromium.

## Technical Feasibility Gate

PDF feasibility is the first implementation milestone, before the full editor or landing page. Build the shared template contract, all three template shells, print CSS, and these fixtures:

1. A concise one-page resume.
2. A resume populating every standard JSON Resume section.
3. A long resume spanning at least three A4 pages.

The browser-only approach passes when stable Chromium output satisfies all of the following:

- The PDF contains selectable text.
- Extracted text follows a logical reading order.
- Every populated standard section appears.
- There are no overlaps, clipped content, accidental blank pages, or orphaned section headings.
- Links survive PDF generation.
- Page breaks are acceptable for normal entries and safe for entries longer than one page.
- Preview and PDF are reasonably equivalent in typography, spacing, and order.
- Repeated generation is deterministic in the pinned Playwright Chromium environment.

If this gate fails materially, stop before building the complete editor. Reassess a dedicated client PDF renderer or server-side pinned Chromium, explicitly revisiting the privacy and cost trade-offs.

## Testing Strategy

### Unit Tests

- Parse valid and invalid JSON.
- Map AJV errors to actionable editor diagnostics.
- Restore, migrate, and clear versioned local state.
- Format dates, locations, and links without mutating input.
- Omit empty sections and preserve populated fields.

### Component Tests

- Every template renders each standard section from the complete fixture.
- Template switching preserves editor content.
- Invalid edits retain the last valid preview and expose stale-preview status.
- JSON and PDF actions enable only for a valid current draft.

### Browser and PDF Tests

- Import, edit, persist, reload, clear, and export flows in Chromium.
- Responsive desktop split view and mobile tab view.
- Playwright `page.pdf()` with A4 and print backgrounds for deterministic print fixtures.
- PDF text extraction to check presence and broad reading order.
- Page count and regression snapshots for the one-page, complete, and long fixtures.
- Manual verification through Chrome's native print dialog before release, because automated `page.pdf()` does not exercise the dialog itself.

## MVP Scope

### Included

- English SEO landing page.
- Static Astro application and React editor island.
- Local JSON import.
- Code editor with formatting and diagnostics.
- Complete official JSON Resume schema validation and rendering.
- Three single-column ATS-oriented templates.
- Live preview and template selection.
- Automatic local persistence and explicit deletion.
- JSON download.
- A4 multipage output through desktop Chromium's print dialog.
- Responsive editor UI.
- Automated and manual PDF validation.

### Excluded

- Visual form editing.
- PDF-to-JSON conversion.
- AI assistance or multimodal models.
- Accounts, cloud synchronization, collaboration, or backend services.
- Multiple resume management.
- Premium templates, payments, and agency features.
- Direct PDF download without the browser print dialog.
- Non-A4 output.
- Guaranteed output parity across browsers.
- A guarantee of acceptance by every ATS product.

## Future Evolution

The architecture admits additional local or remote import adapters without changing templates. A future multimodal PDF-to-JSON service would produce a candidate JSON Resume object that enters the existing editor and validation pipeline. Because such a service may transmit personal data, it requires a separate privacy design and explicit user consent.

Premium themes can implement the same template contract. Server-side PDF generation remains an optional future capability if direct downloads or exact cross-browser reproducibility become more valuable than the current zero-server privacy model.

## Key Risks and Mitigations

- **Browser print variance:** officially support desktop Chromium and execute the feasibility gate first.
- **Preview/PDF drift:** share one semantic DOM and separate only screen and print presentation rules.
- **ATS variability:** use selectable text and a linear reading order, and avoid claiming universal ATS compatibility.
- **Long-content pagination:** test representative multipage fixtures and permit oversized entries to split.
- **Schema evolution:** pin the schema package/version and update it deliberately with fixture and template tests.
- **Sensitive local persistence:** disclose browser storage behavior and provide an obvious clear-data action.
- **Template omissions:** use a complete fixture and contract tests for every standard section in every template.

## Delivery Sequence

1. Establish project tooling and test fixtures.
2. Complete the PDF feasibility gate with three templates.
3. Implement parsing, complete schema validation, and diagnostics.
4. Integrate CodeMirror and last-valid-preview state handling.
5. Add import, JSON export, local persistence, and clear-data behavior.
6. Build the responsive workspace and template selector.
7. Add the Astro landing page, privacy copy, SEO metadata, and browser support messaging.
8. Run automated and manual acceptance checks before release.
