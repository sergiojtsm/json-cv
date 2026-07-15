# JSON Resume Editor MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the browser-only JSON Resume editor that imports, validates, edits, persists, previews, exports, clears, and prints a resume through the three proven A4 templates.

**Architecture:** Extend the existing Screaming/Hexagonal structure. Pure draft evaluation and editor state live in domain/application modules; AJV, localStorage, File/Blob APIs, CodeMirror, React, and `window.print()` remain adapters. A single React island composes these ports and renders the existing template registry without introducing global state.

**Tech Stack:** Astro 7.0.9, React 19.2.7, TypeScript 5.9.3, CodeMirror 6 through `@uiw/react-codemirror` 4.25.11, AJV 8.20.0, Vitest 4.1.10, Testing Library React 16.3.2, Testing Library User Event 14.6.1, Playwright 1.61.1.

## Global Constraints

- Production remains a fully static Astro build with no API routes, login, analytics that capture resume content, or server runtime.
- Raw editor text is the draft source of truth; templates receive only the latest schema-valid `Resume`.
- Invalid edits are persisted locally but never replace the latest valid preview.
- `@jsonresume/schema@1.3.0` remains the only resume contract; no Zod schema or duplicate resume model may be introduced.
- State uses `useReducer`; Redux, Zustand, and equivalent global stores are excluded.
- Browser boundaries remain behind `ResumeValidator`, `DraftRepository`, `ResumeFileGateway`, and `PrintGateway` ports.
- Draft persistence uses one versioned localStorage key and stores only raw text, selected template, and storage version.
- JSON and PDF actions are disabled while the current draft is invalid.
- Desktop uses split editor/preview; mobile uses Editor/Preview tabs.
- PDF support remains A4 on current stable desktop Chrome/Chromium through `window.print()` and the already validated template DOM/CSS.
- UI copy is English; resume data is rendered in its source language.
- This plan does not implement the SEO landing page, form-based editing, AI, PDF import, accounts, payments, or multiple resumes.

---

## Planned File Map

```text
src/
├── pages/editor.astro
├── resume-editor/
│   ├── domain/
│   │   ├── draft-evaluation.ts
│   │   ├── editor-state.ts
│   │   └── validation-result.ts
│   ├── application/
│   │   ├── evaluate-resume-draft.ts
│   │   ├── parse-stored-draft.ts
│   │   ├── ports/
│   │   │   ├── draft-repository.ts
│   │   │   ├── print-gateway.ts
│   │   │   ├── resume-file-gateway.ts
│   │   │   └── resume-validator.ts
│   │   └── use-resume-editor.ts
│   ├── adapters/
│   │   ├── browser/
│   │   │   ├── browser-print-gateway.ts
│   │   │   └── browser-resume-file-gateway.ts
│   │   ├── persistence/local-storage-draft-repository.ts
│   │   └── validation/ajv-resume-validator.ts
│   └── ui/
│       ├── JsonEditor.tsx
│       ├── ResumeWorkspace.tsx
│       ├── TemplateSelector.tsx
│       ├── ValidationPanel.tsx
│       └── editor.css
tests/
├── e2e/editor.spec.ts
└── unit/
    ├── browser-gateways.test.ts
    ├── draft-evaluation.test.ts
    ├── editor-state.test.ts
    ├── local-storage-draft-repository.test.ts
    └── resume-workspace.test.tsx
```

### Task 1: Evaluate Raw JSON Drafts

**Files:**

- Create: `src/resume-editor/domain/draft-evaluation.ts`
- Create: `src/resume-editor/application/evaluate-resume-draft.ts`
- Create: `tests/unit/draft-evaluation.test.ts`
- Modify: `src/resume-editor/domain/validation-result.ts`

**Interfaces:**

- Consumes: `ResumeValidator.validate(candidate: unknown): ResumeValidationResult`.
- Produces: `evaluateResumeDraft(rawText, validator): DraftEvaluation`.

- [ ] **Step 1: Write the failing draft-evaluation tests**

Create `tests/unit/draft-evaluation.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { evaluateResumeDraft } from "../../src/resume-editor/application/evaluate-resume-draft";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";

describe("evaluateResumeDraft", () => {
  const validator = new AjvResumeValidator();

  it("classifies whitespace as empty", () => {
    expect(evaluateResumeDraft("  \n", validator)).toEqual({
      status: "empty",
      diagnostics: [],
    });
  });

  it("returns a location-aware syntax diagnostic", () => {
    const result = evaluateResumeDraft(
      '{\n  "basics": {\n    "name": "Alex"\n  ',
      validator,
    );
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("Expected invalid result");
    expect(result.reason).toBe("syntax");
    expect(result.diagnostics[0]).toEqual(
      expect.objectContaining({
        keyword: "syntax",
        path: "/",
        line: expect.any(Number),
        column: expect.any(Number),
      }),
    );
  });

  it("returns every AJV schema diagnostic", () => {
    const result = evaluateResumeDraft(
      '{"basics":{"email":"bad"},"work":[{"startDate":"March"}]}',
      validator,
    );
    expect(result.status).toBe("invalid");
    if (result.status !== "invalid") throw new Error("Expected invalid result");
    expect(result.reason).toBe("schema");
    expect(result.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/basics/email", keyword: "format" }),
        expect.objectContaining({
          path: "/work/0/startDate",
          keyword: "pattern",
        }),
      ]),
    );
  });

  it("returns a typed resume when parsing and validation succeed", () => {
    const result = evaluateResumeDraft(
      '{"basics":{"name":"Alex Morgan"}}',
      validator,
    );
    expect(result).toEqual({
      status: "valid",
      diagnostics: [],
      resume: { basics: { name: "Alex Morgan" } },
    });
  });
});
```

- [ ] **Step 2: Verify RED**

Run `npm test -- tests/unit/draft-evaluation.test.ts`.

Expected: FAIL because `evaluate-resume-draft` does not exist.

- [ ] **Step 3: Define diagnostics and evaluation results**

Replace `src/resume-editor/domain/validation-result.ts` with:

```ts
import type { Resume } from "../../resume/domain/generated/resume";

export type ValidationDiagnostic = {
  path: string;
  keyword: string;
  message: string;
  line?: number;
  column?: number;
};

export type ResumeValidationResult =
  | { ok: true; value: Resume }
  | { ok: false; diagnostics: ValidationDiagnostic[] };
```

Create `src/resume-editor/domain/draft-evaluation.ts`:

```ts
import type { Resume } from "../../resume/domain/generated/resume";
import type { ValidationDiagnostic } from "./validation-result";

export type DraftEvaluation =
  | { status: "empty"; diagnostics: [] }
  | { status: "valid"; diagnostics: []; resume: Resume }
  | {
      status: "invalid";
      reason: "syntax" | "schema";
      diagnostics: ValidationDiagnostic[];
    };
```

- [ ] **Step 4: Implement pure draft evaluation**

Create `src/resume-editor/application/evaluate-resume-draft.ts`:

```ts
import type { DraftEvaluation } from "../domain/draft-evaluation";
import type { ResumeValidator } from "./ports/resume-validator";

const positionFromMessage = (message: string, source: string) => {
  const explicit = message.match(/line\s+(\d+)\s+column\s+(\d+)/i);
  if (explicit)
    return { line: Number(explicit[1]), column: Number(explicit[2]) };
  const position = Number(message.match(/position\s+(\d+)/i)?.[1]);
  if (!Number.isFinite(position)) return { line: 1, column: 1 };
  const before = source.slice(0, position);
  const lines = before.split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
};

export const evaluateResumeDraft = (
  rawText: string,
  validator: ResumeValidator,
): DraftEvaluation => {
  if (!rawText.trim()) return { status: "empty", diagnostics: [] };

  let candidate: unknown;
  try {
    candidate = JSON.parse(rawText);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return {
      status: "invalid",
      reason: "syntax",
      diagnostics: [
        {
          path: "/",
          keyword: "syntax",
          message,
          ...positionFromMessage(message, rawText),
        },
      ],
    };
  }

  const result = validator.validate(candidate);
  return result.ok
    ? { status: "valid", diagnostics: [], resume: result.value }
    : { status: "invalid", reason: "schema", diagnostics: result.diagnostics };
};
```

- [ ] **Step 5: Verify GREEN and commit**

Run:

```bash
npm test -- tests/unit/draft-evaluation.test.ts
npm run build
git add src/resume-editor tests/unit/draft-evaluation.test.ts
git commit -m "feat: evaluate json resume drafts"
```

Expected: 4 focused tests pass and Astro reports zero diagnostics.

### Task 2: Model Editor State with a Reducer

**Files:**

- Create: `src/resume-editor/domain/editor-state.ts`
- Create: `tests/unit/editor-state.test.ts`

**Interfaces:**

- Consumes: `DraftEvaluation`, `Resume`, and `TemplateId`.
- Produces: `createEditorState(rawText, template, evaluation)` and `editorReducer(state, event)`.

- [ ] **Step 1: Write failing reducer tests**

Create `tests/unit/editor-state.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  createEditorState,
  editorReducer,
} from "../../src/resume-editor/domain/editor-state";
import { shortResume } from "../../src/resume-fixtures/resumes";
import type { DraftEvaluation } from "../../src/resume-editor/domain/draft-evaluation";

describe("editorReducer", () => {
  const valid: DraftEvaluation = {
    status: "valid",
    diagnostics: [],
    resume: shortResume,
  };

  it("initializes from a valid draft", () => {
    const state = createEditorState("{}", "editorial", valid);
    expect(state).toEqual(
      expect.objectContaining({
        status: "valid",
        currentResume: shortResume,
        lastValidResume: shortResume,
        previewStale: false,
      }),
    );
  });

  it("keeps the last valid preview during an invalid edit", () => {
    const state = createEditorState("{}", "editorial", valid);
    const next = editorReducer(state, {
      type: "draftEvaluated",
      rawText: "{",
      evaluation: {
        status: "invalid",
        reason: "syntax",
        diagnostics: [{ path: "/", keyword: "syntax", message: "bad" }],
      },
    });
    expect(next).toEqual(
      expect.objectContaining({
        rawText: "{",
        status: "invalid",
        currentResume: null,
        lastValidResume: shortResume,
        previewStale: true,
      }),
    );
  });

  it("changes template without changing draft data", () => {
    const state = createEditorState("{}", "editorial", valid);
    expect(
      editorReducer(state, { type: "templateSelected", template: "minimal" }),
    ).toEqual(
      expect.objectContaining({
        rawText: "{}",
        selectedTemplate: "minimal",
        lastValidResume: shortResume,
      }),
    );
  });

  it("tracks persistence failures and clears all local state", () => {
    const state = createEditorState("{}", "editorial", valid);
    expect(
      editorReducer(state, { type: "persistenceFailed" }).persistenceStatus,
    ).toBe("failed");
    expect(editorReducer(state, { type: "cleared" })).toEqual(
      expect.objectContaining({
        rawText: "",
        status: "empty",
        lastValidResume: null,
        selectedTemplate: "editorial",
      }),
    );
  });
});
```

- [ ] **Step 2: Verify RED**

Run `npm test -- tests/unit/editor-state.test.ts`.

Expected: FAIL because `editor-state` does not exist.

- [ ] **Step 3: Implement editor state**

Create `src/resume-editor/domain/editor-state.ts`:

```ts
import type { Resume } from "../../resume/domain/generated/resume";
import type { TemplateId } from "../../resume-templates/domain/resume-template";
import type { DraftEvaluation } from "./draft-evaluation";
import type { ValidationDiagnostic } from "./validation-result";

export type EditorState = {
  rawText: string;
  status: DraftEvaluation["status"];
  currentResume: Resume | null;
  lastValidResume: Resume | null;
  diagnostics: ValidationDiagnostic[];
  selectedTemplate: TemplateId;
  previewStale: boolean;
  persistenceStatus: "idle" | "pending" | "saved" | "failed";
};

export type EditorEvent =
  | { type: "draftEvaluated"; rawText: string; evaluation: DraftEvaluation }
  | { type: "templateSelected"; template: TemplateId }
  | { type: "persistencePending" | "persistenceSaved" | "persistenceFailed" }
  | { type: "cleared" };

export const createEditorState = (
  rawText: string,
  template: TemplateId,
  evaluation: DraftEvaluation,
): EditorState => ({
  rawText,
  status: evaluation.status,
  currentResume: evaluation.status === "valid" ? evaluation.resume : null,
  lastValidResume: evaluation.status === "valid" ? evaluation.resume : null,
  diagnostics: evaluation.diagnostics,
  selectedTemplate: template,
  previewStale: false,
  persistenceStatus: "idle",
});

export const editorReducer = (
  state: EditorState,
  event: EditorEvent,
): EditorState => {
  if (event.type === "templateSelected")
    return {
      ...state,
      selectedTemplate: event.template,
      persistenceStatus: "pending",
    };
  if (event.type === "persistencePending")
    return { ...state, persistenceStatus: "pending" };
  if (event.type === "persistenceSaved")
    return { ...state, persistenceStatus: "saved" };
  if (event.type === "persistenceFailed")
    return { ...state, persistenceStatus: "failed" };
  if (event.type === "cleared")
    return createEditorState("", "editorial", {
      status: "empty",
      diagnostics: [],
    });

  const validResume =
    event.evaluation.status === "valid" ? event.evaluation.resume : null;
  return {
    ...state,
    rawText: event.rawText,
    status: event.evaluation.status,
    currentResume: validResume,
    lastValidResume: validResume ?? state.lastValidResume,
    diagnostics: event.evaluation.diagnostics,
    previewStale:
      event.evaluation.status !== "valid" && state.lastValidResume !== null,
    persistenceStatus: "pending",
  };
};
```

- [ ] **Step 4: Verify and commit**

```bash
npm test -- tests/unit/editor-state.test.ts
git add src/resume-editor/domain/editor-state.ts tests/unit/editor-state.test.ts
git commit -m "feat: model resume editor state"
```

Expected: 4 tests pass.

### Task 3: Persist Versioned Drafts Locally

**Files:**

- Create: `src/resume-editor/application/ports/draft-repository.ts`
- Create: `src/resume-editor/application/parse-stored-draft.ts`
- Create: `src/resume-editor/adapters/persistence/local-storage-draft-repository.ts`
- Create: `tests/unit/local-storage-draft-repository.test.ts`

**Interfaces:**

- Produces: `StoredDraft`, `parseStoredDraft(value)`, and `LocalStorageDraftRepository`.

- [ ] **Step 1: Write failing persistence tests**

Create `tests/unit/local-storage-draft-repository.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { LocalStorageDraftRepository } from "../../src/resume-editor/adapters/persistence/local-storage-draft-repository";

describe("LocalStorageDraftRepository", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips a versioned draft", () => {
    const repository = new LocalStorageDraftRepository(localStorage);
    repository.save({
      version: 1,
      rawText: "{",
      selectedTemplate: "professional",
    });
    expect(repository.load()).toEqual({
      version: 1,
      rawText: "{",
      selectedTemplate: "professional",
    });
  });

  it("ignores malformed, unsupported, and unknown-template records", () => {
    const repository = new LocalStorageDraftRepository(localStorage);
    for (const value of [
      "bad",
      '{"version":2}',
      '{"version":1,"rawText":"{}","selectedTemplate":"unknown"}',
    ]) {
      localStorage.setItem("json-cv:draft", value);
      expect(repository.load()).toBeNull();
    }
  });

  it("clears only the editor key", () => {
    const repository = new LocalStorageDraftRepository(localStorage);
    localStorage.setItem("other", "keep");
    repository.save({
      version: 1,
      rawText: "{}",
      selectedTemplate: "editorial",
    });
    repository.clear();
    expect(repository.load()).toBeNull();
    expect(localStorage.getItem("other")).toBe("keep");
  });
});
```

Add `// @vitest-environment jsdom` as the first line.

- [ ] **Step 2: Verify RED**

Run `npm test -- tests/unit/local-storage-draft-repository.test.ts`.

Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement the port, parser, and adapter**

Create `src/resume-editor/application/ports/draft-repository.ts`:

```ts
import type { TemplateId } from "../../../resume-templates/domain/resume-template";
export type StoredDraft = {
  version: 1;
  rawText: string;
  selectedTemplate: TemplateId;
};
export interface DraftRepository {
  load(): StoredDraft | null;
  save(draft: StoredDraft): void;
  clear(): void;
}
```

Create `src/resume-editor/application/parse-stored-draft.ts`:

```ts
import { templateIds } from "../../resume-templates/domain/resume-template";
import type { StoredDraft } from "./ports/draft-repository";

export const parseStoredDraft = (value: unknown): StoredDraft | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.version !== 1 || typeof record.rawText !== "string") return null;
  if (!templateIds.includes(record.selectedTemplate as never)) return null;
  return {
    version: 1,
    rawText: record.rawText,
    selectedTemplate:
      record.selectedTemplate as StoredDraft["selectedTemplate"],
  };
};
```

Create `src/resume-editor/adapters/persistence/local-storage-draft-repository.ts`:

```ts
import { parseStoredDraft } from "../../application/parse-stored-draft";
import type {
  DraftRepository,
  StoredDraft,
} from "../../application/ports/draft-repository";

export class LocalStorageDraftRepository implements DraftRepository {
  constructor(
    private readonly storage: Storage,
    private readonly key = "json-cv:draft",
  ) {}
  load(): StoredDraft | null {
    const raw = this.storage.getItem(this.key);
    if (!raw) return null;
    try {
      return parseStoredDraft(JSON.parse(raw));
    } catch {
      return null;
    }
  }
  save(draft: StoredDraft): void {
    this.storage.setItem(this.key, JSON.stringify(draft));
  }
  clear(): void {
    this.storage.removeItem(this.key);
  }
}
```

- [ ] **Step 4: Verify and commit**

```bash
npm test -- tests/unit/local-storage-draft-repository.test.ts
git add src/resume-editor tests/unit/local-storage-draft-repository.test.ts
git commit -m "feat: persist versioned resume drafts"
```

Expected: 3 tests pass.

### Task 4: Add Browser File and Print Gateways

**Files:**

- Create: `src/resume-editor/application/ports/resume-file-gateway.ts`
- Create: `src/resume-editor/application/ports/print-gateway.ts`
- Create: `src/resume-editor/adapters/browser/browser-resume-file-gateway.ts`
- Create: `src/resume-editor/adapters/browser/browser-print-gateway.ts`
- Create: `tests/unit/browser-gateways.test.ts`

**Interfaces:**

- Produces: `ResumeFileGateway`, `BrowserResumeFileGateway`, `PrintGateway`, and `BrowserPrintGateway`.

- [ ] **Step 1: Write failing gateway tests**

Create `tests/unit/browser-gateways.test.ts` with jsdom environment:

```ts
// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { BrowserPrintGateway } from "../../src/resume-editor/adapters/browser/browser-print-gateway";
import { BrowserResumeFileGateway } from "../../src/resume-editor/adapters/browser/browser-resume-file-gateway";

describe("browser gateways", () => {
  it("reads a local file as text", async () => {
    const gateway = new BrowserResumeFileGateway(document, URL);
    await expect(
      gateway.read(new File(['{"basics":{}}'], "resume.json")),
    ).resolves.toBe('{"basics":{}}');
  });

  it("downloads formatted JSON and revokes the object URL", () => {
    const createObjectURL = vi.fn(() => "blob:resume");
    const revokeObjectURL = vi.fn();
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);
    const gateway = new BrowserResumeFileGateway(document, {
      createObjectURL,
      revokeObjectURL,
    });
    gateway.download({ basics: { name: "Alex" } });
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:resume");
  });

  it("delegates printing to the browser", () => {
    const print = vi.fn();
    new BrowserPrintGateway({ print }).print();
    expect(print).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Verify RED**

Run `npm test -- tests/unit/browser-gateways.test.ts`.

Expected: FAIL because the gateway modules do not exist.

- [ ] **Step 3: Implement gateways**

Create `src/resume-editor/application/ports/resume-file-gateway.ts`:

```ts
import type { Resume } from "../../../resume/domain/generated/resume";
export interface ResumeFileGateway {
  read(file: File): Promise<string>;
  download(resume: Resume): void;
}
```

Create `src/resume-editor/application/ports/print-gateway.ts`:

```ts
export interface PrintGateway {
  print(): void;
}
```

Create `src/resume-editor/adapters/browser/browser-resume-file-gateway.ts`:

```ts
import type { Resume } from "../../../resume/domain/generated/resume";
import type { ResumeFileGateway } from "../../application/ports/resume-file-gateway";

type UrlApi = Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
export class BrowserResumeFileGateway implements ResumeFileGateway {
  constructor(
    private readonly document: Document,
    private readonly url: UrlApi,
  ) {}
  read(file: File): Promise<string> {
    return file.text();
  }
  download(resume: Resume): void {
    const href = this.url.createObjectURL(
      new Blob([`${JSON.stringify(resume, null, 2)}\n`], {
        type: "application/json",
      }),
    );
    const anchor = this.document.createElement("a");
    anchor.href = href;
    anchor.download = "resume.json";
    anchor.click();
    this.url.revokeObjectURL(href);
  }
}
```

Create `src/resume-editor/adapters/browser/browser-print-gateway.ts`:

```ts
import type { PrintGateway } from "../../application/ports/print-gateway";
export class BrowserPrintGateway implements PrintGateway {
  constructor(private readonly target: Pick<Window, "print">) {}
  print(): void {
    this.target.print();
  }
}
```

- [ ] **Step 4: Verify and commit**

```bash
npm test -- tests/unit/browser-gateways.test.ts
git add src/resume-editor tests/unit/browser-gateways.test.ts
git commit -m "feat: add browser resume gateways"
```

Expected: 3 tests pass.

### Task 5: Coordinate Editor State and Effects

**Files:**

- Create: `src/resume-editor/application/use-resume-editor.ts`
- Create: `tests/unit/use-resume-editor.test.tsx`

**Interfaces:**

- Consumes: all four ports, `evaluateResumeDraft`, and `editorReducer`.
- Produces: `useResumeEditor(dependencies)` commands and state.

- [ ] **Step 1: Write failing hook behavior tests**

Create `tests/unit/use-resume-editor.test.tsx` with jsdom environment. Use `renderHook`, `act`, and fake timers to verify:

```tsx
// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useResumeEditor } from "../../src/resume-editor/application/use-resume-editor";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";
import type { StoredDraft } from "../../src/resume-editor/application/ports/draft-repository";

const dependencies = () => ({
  validator: new AjvResumeValidator(),
  draftRepository: {
    load: vi.fn<() => StoredDraft | null>(() => null),
    save: vi.fn<(draft: StoredDraft) => void>(),
    clear: vi.fn<() => void>(),
  },
  fileGateway: {
    read: vi.fn<(file: File) => Promise<string>>(),
    download: vi.fn<(resume: unknown) => void>(),
  },
  printGateway: { print: vi.fn<() => void>() },
});

describe("useResumeEditor", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("restores, validates, and debounces raw drafts", () => {
    const deps = dependencies();
    deps.draftRepository.load.mockReturnValue({
      version: 1,
      rawText: '{"basics":{"name":"Alex"}}',
      selectedTemplate: "minimal",
    });
    const { result } = renderHook(() => useResumeEditor(deps));
    expect(result.current.state.status).toBe("valid");
    expect(result.current.state.selectedTemplate).toBe("minimal");
    act(() => result.current.changeDraft("{"));
    act(() => vi.advanceTimersByTime(300));
    expect(deps.draftRepository.save).toHaveBeenCalledWith({
      version: 1,
      rawText: "{",
      selectedTemplate: "minimal",
    });
    expect(result.current.state.previewStale).toBe(true);
  });

  it("disables export and print for invalid current text", () => {
    const deps = dependencies();
    const { result } = renderHook(() => useResumeEditor(deps));
    act(() => result.current.changeDraft("{"));
    act(() => result.current.exportJson());
    act(() => result.current.print());
    expect(deps.fileGateway.download).not.toHaveBeenCalled();
    expect(deps.printGateway.print).not.toHaveBeenCalled();
  });

  it("imports text, exports valid JSON, and clears persisted data", async () => {
    const deps = dependencies();
    deps.fileGateway.read.mockResolvedValue('{"basics":{"name":"Imported"}}');
    const { result } = renderHook(() => useResumeEditor(deps));
    await act(() => result.current.importFile(new File(["x"], "resume.json")));
    act(() => result.current.exportJson());
    act(() => result.current.print());
    expect(deps.fileGateway.download).toHaveBeenCalledWith({
      basics: { name: "Imported" },
    });
    expect(deps.printGateway.print).toHaveBeenCalledOnce();
    act(() => result.current.clear());
    act(() => vi.advanceTimersByTime(300));
    expect(deps.draftRepository.clear).toHaveBeenCalledOnce();
    expect(deps.draftRepository.save).not.toHaveBeenCalled();
    expect(result.current.state.status).toBe("empty");
  });

  it("surfaces import failures without replacing the current draft", async () => {
    const deps = dependencies();
    deps.fileGateway.read.mockRejectedValue(new Error("Unreadable file"));
    const { result } = renderHook(() => useResumeEditor(deps));
    await act(() => result.current.importFile(new File(["x"], "resume.json")));
    expect(result.current.importError).toBe("Unreadable file");
    expect(result.current.state.status).toBe("empty");
  });

  it("continues in memory when browser storage fails", () => {
    const deps = dependencies();
    deps.draftRepository.save.mockImplementation(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useResumeEditor(deps));
    act(() => result.current.changeDraft('{"basics":{"name":"In memory"}}'));
    act(() => vi.advanceTimersByTime(300));
    expect(result.current.state.status).toBe("valid");
    expect(result.current.state.persistenceStatus).toBe("failed");
  });
});
```

- [ ] **Step 2: Verify RED**

Install exact UI testing dependencies and run the test:

```bash
npm install --save-dev --save-exact @testing-library/react@16.3.2 @testing-library/user-event@14.6.1
npm test -- tests/unit/use-resume-editor.test.tsx
```

Expected: FAIL because `use-resume-editor` does not exist.

- [ ] **Step 3: Implement the application hook**

Create `src/resume-editor/application/use-resume-editor.ts`:

```ts
import { useEffect, useReducer, useState } from "react";
import { evaluateResumeDraft } from "./evaluate-resume-draft";
import type { DraftRepository } from "./ports/draft-repository";
import type { PrintGateway } from "./ports/print-gateway";
import type { ResumeFileGateway } from "./ports/resume-file-gateway";
import type { ResumeValidator } from "./ports/resume-validator";
import { createEditorState, editorReducer } from "../domain/editor-state";
import type { TemplateId } from "../../resume-templates/domain/resume-template";

export type ResumeEditorDependencies = {
  validator: ResumeValidator;
  draftRepository: DraftRepository;
  fileGateway: ResumeFileGateway;
  printGateway: PrintGateway;
};

export const useResumeEditor = (dependencies: ResumeEditorDependencies) => {
  const [restored] = useState(() => {
    try {
      return { draft: dependencies.draftRepository.load(), failed: false };
    } catch {
      return { draft: null, failed: true };
    }
  });
  const [state, dispatch] = useReducer(editorReducer, undefined, () => {
    const rawText = restored.draft?.rawText ?? "";
    const template = restored.draft?.selectedTemplate ?? "editorial";
    return createEditorState(
      rawText,
      template,
      evaluateResumeDraft(rawText, dependencies.validator),
    );
  });
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (restored.failed) dispatch({ type: "persistenceFailed" });
  }, [restored.failed]);

  useEffect(() => {
    if (state.status === "empty" && !state.rawText) return undefined;
    const timeout = window.setTimeout(() => {
      try {
        dependencies.draftRepository.save({
          version: 1,
          rawText: state.rawText,
          selectedTemplate: state.selectedTemplate,
        });
        dispatch({ type: "persistenceSaved" });
      } catch {
        dispatch({ type: "persistenceFailed" });
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [dependencies.draftRepository, state.rawText, state.selectedTemplate]);

  const changeDraft = (rawText: string) => {
    dispatch({
      type: "draftEvaluated",
      rawText,
      evaluation: evaluateResumeDraft(rawText, dependencies.validator),
    });
  };
  const selectTemplate = (template: TemplateId) =>
    dispatch({ type: "templateSelected", template });
  const importFile = async (file: File) => {
    try {
      setImportError(null);
      changeDraft(await dependencies.fileGateway.read(file));
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Unable to import this file.",
      );
    }
  };
  const exportJson = () => {
    if (state.status === "valid" && state.currentResume)
      dependencies.fileGateway.download(state.currentResume);
  };
  const print = () => {
    if (state.status === "valid" && state.currentResume)
      dependencies.printGateway.print();
  };
  const clear = () => {
    try {
      dependencies.draftRepository.clear();
      dispatch({ type: "cleared" });
      setImportError(null);
    } catch {
      dispatch({ type: "persistenceFailed" });
    }
  };

  return {
    state,
    importError,
    changeDraft,
    selectTemplate,
    importFile,
    exportJson,
    print,
    clear,
  };
};
```

- [ ] **Step 4: Verify and commit**

```bash
npm test -- tests/unit/use-resume-editor.test.tsx
npm test
git add package.json package-lock.json src/resume-editor/application/use-resume-editor.ts tests/unit/use-resume-editor.test.tsx
git commit -m "feat: coordinate resume editor workflow"
```

Expected: 5 focused hook tests and the full unit suite pass.

### Task 6: Build CodeMirror and Workspace UI

**Files:**

- Create: `src/resume-editor/ui/JsonEditor.tsx`
- Create: `src/resume-editor/ui/ValidationPanel.tsx`
- Create: `src/resume-editor/ui/TemplateSelector.tsx`
- Create: `src/resume-editor/ui/ResumeWorkspace.tsx`
- Create: `src/resume-editor/ui/editor.css`
- Create: `tests/unit/resume-workspace.test.tsx`
- Modify: `package.json`

**Interfaces:**

- Consumes: `useResumeEditor`, `templateRegistry`, and all browser adapters.
- Produces: `<ResumeWorkspace />` as the single client-only React island.

- [ ] **Step 1: Install exact editor dependencies**

```bash
npm install --save-exact @uiw/react-codemirror@4.25.11 @codemirror/lang-json@6.0.2 @codemirror/lint@6.9.7 @codemirror/view@6.43.6
```

- [ ] **Step 2: Write failing workspace tests**

Create `tests/unit/resume-workspace.test.tsx` with jsdom. Mock only `JsonEditor` to a controlled `<textarea>` so tests exercise real workspace behavior rather than CodeMirror internals. Verify:

```tsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResumeWorkspace } from "../../src/resume-editor/ui/ResumeWorkspace";

vi.mock("../../src/resume-editor/ui/JsonEditor", () => ({
  JsonEditor: ({
    value,
    onChange,
  }: {
    value: string;
    onChange(value: string): void;
  }) => (
    <textarea
      aria-label="JSON editor"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

describe("ResumeWorkspace", () => {
  beforeEach(() => localStorage.clear());
  it("shows valid preview, switches templates, and exposes actions", async () => {
    render(<ResumeWorkspace />);
    fireEvent.change(screen.getByLabelText("JSON editor"), {
      target: { value: '{"basics":{"name":"Alex Morgan"}}' },
    });
    expect(await screen.findByText("Alex Morgan")).not.toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Minimal" }));
    expect(
      screen.getByTestId("resume-preview").querySelector(".theme-minimal"),
    ).not.toBeNull();
    expect(
      (screen.getByRole("button", { name: "Export JSON" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(
      (screen.getByRole("button", { name: "Save as PDF" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("keeps stale preview visible and disables output actions", async () => {
    render(<ResumeWorkspace />);
    fireEvent.change(screen.getByLabelText("JSON editor"), {
      target: { value: '{"basics":{"name":"Alex"}}' },
    });
    fireEvent.change(screen.getByLabelText("JSON editor"), {
      target: { value: "{" },
    });
    expect(
      await screen.findByText("Preview shows the last valid version."),
    ).not.toBeNull();
    expect(
      (screen.getByRole("button", { name: "Export JSON" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Save as PDF" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
```

Provide in-test browser dependencies through optional `ResumeWorkspace` props; production defaults instantiate AJV, localStorage, browser files, and browser print.

- [ ] **Step 3: Verify RED**

Run `npm test -- tests/unit/resume-workspace.test.tsx`.

Expected: FAIL because workspace modules do not exist.

- [ ] **Step 4: Implement focused UI components**

Create `src/resume-editor/ui/JsonEditor.tsx`:

```tsx
import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { linter, type Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import type { ValidationDiagnostic } from "../domain/validation-result";

type Props = {
  value: string;
  diagnostics: ValidationDiagnostic[];
  onChange(value: string): void;
};

const toCodeMirrorDiagnostic = (
  view: EditorView,
  diagnostic: ValidationDiagnostic,
): Diagnostic | null => {
  if (!diagnostic.line) return null;
  const lineNumber = Math.min(
    Math.max(diagnostic.line, 1),
    view.state.doc.lines,
  );
  const line = view.state.doc.line(lineNumber);
  const from = Math.min(
    line.from + Math.max((diagnostic.column ?? 1) - 1, 0),
    line.to,
  );
  return {
    from,
    to: Math.min(from + 1, view.state.doc.length),
    severity: "error",
    message: diagnostic.message,
  };
};

export function JsonEditor({ value, diagnostics, onChange }: Props) {
  const extensions = useMemo(
    () => [
      json(),
      linter((view) =>
        diagnostics.flatMap((item) => toCodeMirrorDiagnostic(view, item) ?? []),
      ),
    ],
    [diagnostics],
  );
  return (
    <CodeMirror
      aria-label="JSON editor"
      value={value}
      height="calc(100vh - 9rem)"
      theme="dark"
      extensions={extensions}
      basicSetup={{
        lineNumbers: true,
        bracketMatching: true,
        closeBrackets: true,
        foldGutter: true,
      }}
      onChange={onChange}
    />
  );
}
```

Create `src/resume-editor/ui/ValidationPanel.tsx`:

```tsx
import type { ValidationDiagnostic } from "../domain/validation-result";

type Props = {
  diagnostics: ValidationDiagnostic[];
  importError: string | null;
  persistenceFailed: boolean;
};
export function ValidationPanel({
  diagnostics,
  importError,
  persistenceFailed,
}: Props) {
  if (!diagnostics.length && !importError && !persistenceFailed) return null;
  return (
    <div className="validation-panel" role="alert">
      {importError && <p>{importError}</p>}
      {persistenceFailed && (
        <p>Local saving failed. Export your JSON to avoid losing changes.</p>
      )}
      {diagnostics.map((item, index) => (
        <p key={`${item.path}-${item.keyword}-${index}`}>
          <strong>{item.path === "/" ? "JSON" : item.path}</strong>:{" "}
          {item.message}
          {item.line ? ` (line ${item.line}, column ${item.column ?? 1})` : ""}
        </p>
      ))}
    </div>
  );
}
```

Create `src/resume-editor/ui/TemplateSelector.tsx`:

```tsx
import {
  templateIds,
  type TemplateId,
} from "../../resume-templates/domain/resume-template";
const names: Record<TemplateId, string> = {
  editorial: "Editorial",
  minimal: "Minimal",
  professional: "Professional",
};
type Props = { value: TemplateId; onChange(template: TemplateId): void };
export function TemplateSelector({ value, onChange }: Props) {
  return (
    <fieldset className="template-selector">
      <legend>Template</legend>
      {templateIds.map((template) => (
        <label key={template}>
          <input
            type="radio"
            name="template"
            checked={value === template}
            onChange={() => onChange(template)}
          />
          {names[template]}
        </label>
      ))}
    </fieldset>
  );
}
```

Create `src/resume-editor/ui/ResumeWorkspace.tsx`:

```tsx
import { useDeferredValue, useState } from "react";
import { templateRegistry } from "../../resume-templates/template-registry";
import {
  useResumeEditor,
  type ResumeEditorDependencies,
} from "../application/use-resume-editor";
import { BrowserPrintGateway } from "../adapters/browser/browser-print-gateway";
import { BrowserResumeFileGateway } from "../adapters/browser/browser-resume-file-gateway";
import { LocalStorageDraftRepository } from "../adapters/persistence/local-storage-draft-repository";
import { AjvResumeValidator } from "../adapters/validation/ajv-resume-validator";
import { JsonEditor } from "./JsonEditor";
import { TemplateSelector } from "./TemplateSelector";
import { ValidationPanel } from "./ValidationPanel";

type Props = { dependencies?: ResumeEditorDependencies };

export function ResumeWorkspace({ dependencies }: Props) {
  const [defaults] = useState<ResumeEditorDependencies>(() => ({
    validator: new AjvResumeValidator(),
    draftRepository: new LocalStorageDraftRepository(window.localStorage),
    fileGateway: new BrowserResumeFileGateway(document, URL),
    printGateway: new BrowserPrintGateway(window),
  }));
  const editor = useResumeEditor(dependencies ?? defaults);
  const previewResume = useDeferredValue(editor.state.lastValidResume);
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");
  const Template = templateRegistry[editor.state.selectedTemplate];
  const outputDisabled =
    editor.state.status !== "valid" || !editor.state.currentResume;

  const clear = () => {
    if (window.confirm("Clear the locally saved resume from this browser?"))
      editor.clear();
  };

  return (
    <main className="editor-app">
      <header className="editor-toolbar">
        <strong>JSON CV</strong>
        <span role="status">
          {editor.state.persistenceStatus === "failed"
            ? "Local save failed"
            : editor.state.persistenceStatus === "pending"
              ? "Saving locally…"
              : editor.state.persistenceStatus === "saved"
                ? "Saved locally"
                : "Local only"}
        </span>
        <div className="editor-actions">
          <label className="file-action">
            Import JSON
            <input
              aria-label="Import JSON file"
              hidden
              type="file"
              accept="application/json,.json"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void editor.importFile(file);
              }}
            />
          </label>
          <button
            type="button"
            disabled={outputDisabled}
            onClick={editor.exportJson}
          >
            Export JSON
          </button>
          <button
            type="button"
            disabled={outputDisabled}
            onClick={editor.print}
          >
            Save as PDF
          </button>
          <button type="button" onClick={clear}>
            Clear local data
          </button>
        </div>
      </header>
      <TemplateSelector
        value={editor.state.selectedTemplate}
        onChange={editor.selectTemplate}
      />
      <div className="mobile-tabs" role="tablist" aria-label="Workspace view">
        <button
          role="tab"
          aria-selected={mobileTab === "editor"}
          onClick={() => setMobileTab("editor")}
        >
          Editor
        </button>
        <button
          role="tab"
          aria-selected={mobileTab === "preview"}
          onClick={() => setMobileTab("preview")}
        >
          Preview
        </button>
      </div>
      <div className="editor-workspace">
        <section
          className="editor-pane"
          data-mobile-hidden={mobileTab !== "editor"}
        >
          <JsonEditor
            value={editor.state.rawText}
            diagnostics={editor.state.diagnostics}
            onChange={editor.changeDraft}
          />
          <ValidationPanel
            diagnostics={editor.state.diagnostics}
            importError={editor.importError}
            persistenceFailed={editor.state.persistenceStatus === "failed"}
          />
        </section>
        <section
          className="preview-pane"
          data-mobile-hidden={mobileTab !== "preview"}
        >
          {editor.state.previewStale && (
            <p className="stale-preview">
              Preview shows the last valid version.
            </p>
          )}
          <div data-testid="resume-preview">
            {previewResume ? (
              <Template resume={previewResume} />
            ) : (
              <p>Import or enter a JSON Resume to begin.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default ResumeWorkspace;
```

Create `src/resume-editor/ui/editor.css` with:

```css
.editor-app {
  min-height: 100vh;
  background: #eef1f4;
  color: #172033;
}
.editor-toolbar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  color: white;
  background: #172033;
}
.editor-actions,
.mobile-tabs {
  display: flex;
  gap: 0.5rem;
}
.file-action {
  cursor: pointer;
  padding: 0.35rem 0.6rem;
  border: 1px solid currentColor;
  border-radius: 0.35rem;
}
.editor-workspace {
  display: grid;
  grid-template-columns: minmax(22rem, 42%) minmax(0, 1fr);
  min-height: calc(100vh - 4rem);
}
.editor-pane {
  min-width: 0;
  background: #111827;
}
.preview-pane {
  min-width: 0;
  overflow: auto;
  padding: 2rem;
}
.validation-panel {
  margin: 0.75rem;
  padding: 0.75rem;
  color: #7f1d1d;
  background: #fee2e2;
  border-radius: 0.5rem;
}
.stale-preview {
  margin: 0 0 0.75rem;
  padding: 0.5rem;
  background: #fff7d6;
}
.mobile-tabs {
  display: none;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
@media (max-width: 800px) {
  .editor-workspace {
    display: block;
  }
  .mobile-tabs {
    display: flex;
    padding: 0.5rem;
  }
  .editor-pane[data-mobile-hidden="true"],
  .preview-pane[data-mobile-hidden="true"] {
    display: none;
  }
  .preview-pane {
    padding: 0.75rem;
  }
}
@media print {
  .editor-toolbar,
  .editor-pane,
  .mobile-tabs,
  .template-selector,
  .validation-panel,
  .stale-preview {
    display: none !important;
  }
  .editor-app,
  .editor-workspace,
  .preview-pane {
    display: block;
    min-height: 0;
    padding: 0;
    overflow: visible;
    background: white;
  }
}
```

- [ ] **Step 5: Verify and commit**

```bash
npm test -- tests/unit/resume-workspace.test.tsx
npm test
npm run build
git add package.json package-lock.json src/resume-editor/ui tests/unit/resume-workspace.test.tsx
git commit -m "feat: build resume editor workspace"
```

Expected: workspace tests, full unit suite, and Astro build pass.

### Task 7: Mount the Editor and Verify Browser Workflows

**Files:**

- Create: `src/pages/editor.astro`
- Create: `tests/e2e/editor.spec.ts`
- Modify: `src/pages/index.astro`
- Modify: `playwright.config.ts`
- Modify: `package.json`

**Interfaces:**

- Consumes: `<ResumeWorkspace />`.
- Produces: static `/editor/` route and `npm run test:e2e`.

- [ ] **Step 1: Configure E2E scripts and write failing workflow tests**

Change Playwright `testDir` to `tests`, retain static build/preview and `reuseExistingServer: false`, and add:

```json
{
  "scripts": {
    "test:pdf": "playwright test tests/pdf",
    "test:e2e": "playwright test tests/e2e",
    "test:all": "npm test && npm run test:pdf && npm run test:e2e && npm run build && npm run check:generated-types"
  }
}
```

Create `tests/e2e/editor.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/editor/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("edits, validates, switches template, and restores local draft", async ({
  page,
}) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type('{"basics":{"name":"Browser User"}}');
  await expect(
    page.getByTestId("resume-preview").getByText("Browser User"),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Professional" }).check();
  await page.waitForTimeout(350);
  await page.reload();
  await expect(
    page.getByTestId("resume-preview").getByText("Browser User"),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "Professional" })).toBeChecked();
});

test("retains stale preview and blocks output for invalid JSON", async ({
  page,
}) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type('{"basics":{"name":"Valid User"}}');
  await expect(
    page.getByTestId("resume-preview").getByText("Valid User"),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("{");
  await expect(
    page.getByText("Preview shows the last valid version."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export JSON" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save as PDF" }),
  ).toBeDisabled();
});

test("imports, exports, and clears local data", async ({ page }) => {
  await page.getByLabel("Import JSON file").setInputFiles({
    name: "resume.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"basics":{"name":"Imported User"}}'),
  });
  await expect(
    page.getByTestId("resume-preview").getByText("Imported User"),
  ).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON" }).click();
  await expect((await downloadPromise).suggestedFilename()).toBe("resume.json");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear local data" }).click();
  await expect(
    page.getByTestId("resume-preview").getByText("Imported User"),
  ).toHaveCount(0);
});

test("uses Editor and Preview tabs on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("tab", { name: "Editor" })).toBeVisible();
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.locator(".editor-pane")).toHaveCSS("display", "none");
  await expect(page.locator(".preview-pane")).not.toHaveCSS("display", "none");
});

test("print media hides editor chrome and keeps the preview", async ({
  page,
}) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type('{"basics":{"name":"Print User"}}');
  await page.emulateMedia({ media: "print" });
  await expect(page.locator(".editor-toolbar")).toHaveCSS("display", "none");
  await expect(page.locator(".template-selector")).toHaveCSS("display", "none");
  await expect(
    page.getByTestId("resume-preview").getByText("Print User"),
  ).toBeVisible();
});
```

- [ ] **Step 2: Verify RED**

Run `npm run test:e2e` before creating the editor route.

Expected: FAIL because `/editor/` does not exist.

- [ ] **Step 3: Mount the editor with accessible controls**

Create `src/pages/editor.astro`:

```astro
---
import ResumeWorkspace from "../resume-editor/ui/ResumeWorkspace";
import "../resume-editor/ui/editor.css";
import "../resume-templates/template.css";
import "../shared/styles/global.css";
---

<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width" />
    <meta
      name="description"
      content="Edit JSON Resume locally and save an ATS-friendly PDF."
    />
    <title>JSON Resume Editor</title>
  </head>
  <body>
    <ResumeWorkspace client:only="react" />
  </body>
</html>
```

Export `ResumeWorkspace` as default. Add an **Open editor** link to `src/pages/index.astro` without replacing the feasibility links. Use the labels, roles, and test IDs defined in Task 6 so the five E2E workflows exercise the production controls without test-only branches.

- [ ] **Step 4: Run the complete gate**

```bash
npm run format
npm run test:all
npm run format:check
git diff --check
```

Expected: all unit, 10 PDF, 5 editor E2E, build, generated-type, formatting, and whitespace checks pass. Existing PDF page counts remain 1/2/5.

- [ ] **Step 5: Commit the browser-complete editor**

```bash
git add package.json package-lock.json playwright.config.ts src/pages src/resume-editor tests/e2e
git commit -m "feat: ship browser-only resume editor"
```

## Stop Condition

The editor plan is complete when `/editor/` supports local JSON import, live validated editing, latest-valid preview, three-template selection, debounced versioned persistence, JSON export, clear-data confirmation, and Chrome printing; all existing PDF tests and new editor E2E tests pass against the static production build. The SEO landing page remains a separate follow-up plan.
