# Error Visualization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the scroll-hidden `ValidationPanel` with an always-visible toolbar error badge that opens a floating dropdown listing all validation problems, import errors, and persistence failures.

**Architecture:** A new `ErrorWidget` React component lives in the toolbar. It owns open/close state and composes an `ErrorBadge` (count + aria), an `ErrorDropdown` (dark, scrollable list), and a visually-hidden `aria-live` summary. Navigable rows (syntax errors with a line) call back into `JsonEditor`, which exposes an imperative `scrollToLine` handle. Existing CodeMirror inline linting is untouched.

**Tech Stack:** React 19, TypeScript 5.9, `@uiw/react-codemirror` 4.25, `@codemirror/view` 6.43, Vitest 4 (jsdom + `@testing-library/react`), Playwright 1.61.

## Global Constraints

- Node `>=22.12.0`.
- Unit test files start with `// @vitest-environment jsdom` when they render React.
- Unit test command: `npm test` (`vitest run --passWithNoTests`); single file: `npx vitest run <path>`.
- e2e command: `npm run test:e2e`.
- Type/build check: `npm run build` (runs `astro check`). Lighter check during dev: `npx astro check`.
- Format before commit: `npx prettier --write <changed files>`.
- Follow existing hexagonal layout under `src/resume-editor/`; UI components live in `src/resume-editor/ui/`.
- UI copy language: mixed ES/EN as in the current app (badge/dropdown labels in Spanish, existing persistence copy kept verbatim in English).

---

### Task 1: Error widget pure helpers

**Files:**
- Create: `src/resume-editor/ui/error-widget-utils.ts`
- Test: `tests/unit/error-widget-utils.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `formatBadgeCount(count: number): string`
  - `describeErrorSummary(input: { count: number; hasNotices: boolean }): string`

- [ ] **Step 1: Write the failing test**

Create `tests/unit/error-widget-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  describeErrorSummary,
  formatBadgeCount,
} from "../../src/resume-editor/ui/error-widget-utils";

describe("formatBadgeCount", () => {
  it("shows the raw count up to 99", () => {
    expect(formatBadgeCount(0)).toBe("0");
    expect(formatBadgeCount(99)).toBe("99");
  });

  it("caps counts above 99", () => {
    expect(formatBadgeCount(100)).toBe("99+");
    expect(formatBadgeCount(2500)).toBe("99+");
  });
});

describe("describeErrorSummary", () => {
  it("describes validation error counts", () => {
    expect(describeErrorSummary({ count: 1, hasNotices: false })).toBe(
      "1 error de validación",
    );
    expect(describeErrorSummary({ count: 3, hasNotices: false })).toBe(
      "3 errores de validación",
    );
  });

  it("falls back to notices then the empty state", () => {
    expect(describeErrorSummary({ count: 0, hasNotices: true })).toBe(
      "Avisos pendientes",
    );
    expect(describeErrorSummary({ count: 0, hasNotices: false })).toBe(
      "Sin errores",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/error-widget-utils.test.ts`
Expected: FAIL — cannot resolve `error-widget-utils`.

- [ ] **Step 3: Write minimal implementation**

Create `src/resume-editor/ui/error-widget-utils.ts`:

```ts
export const formatBadgeCount = (count: number): string =>
  count > 99 ? "99+" : String(count);

export const describeErrorSummary = ({
  count,
  hasNotices,
}: {
  count: number;
  hasNotices: boolean;
}): string => {
  if (count === 1) return "1 error de validación";
  if (count > 1) return `${count} errores de validación`;
  if (hasNotices) return "Avisos pendientes";
  return "Sin errores";
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/error-widget-utils.test.ts`
Expected: PASS (6 assertions).

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/resume-editor/ui/error-widget-utils.ts tests/unit/error-widget-utils.test.ts
git add src/resume-editor/ui/error-widget-utils.ts tests/unit/error-widget-utils.test.ts
git commit -m "feat: add error widget count and summary helpers"
```

---

### Task 2: CodeMirror line navigation helper

**Files:**
- Create: `src/resume-editor/ui/json-editor-navigation.ts`
- Test: `tests/unit/json-editor-navigation.test.ts`

**Interfaces:**
- Consumes: `EditorView` from `@codemirror/view`.
- Produces: `scrollViewToLine(view: EditorView, line: number): void` — clamps `line` to `[1, doc.lines]` and dispatches a selection + scroll to the line start.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/json-editor-navigation.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import type { EditorView } from "@codemirror/view";
import { scrollViewToLine } from "../../src/resume-editor/ui/json-editor-navigation";

const fakeView = (lines: number, from: number) => {
  const dispatch = vi.fn();
  const view = {
    state: { doc: { lines, line: vi.fn(() => ({ from })) } },
    dispatch,
  } as unknown as EditorView;
  return { view, dispatch, lineFn: view.state.doc.line as unknown as ReturnType<typeof vi.fn> };
};

describe("scrollViewToLine", () => {
  it("dispatches a selection at the requested line start", () => {
    const { view, dispatch, lineFn } = fakeView(10, 42);
    scrollViewToLine(view, 3);
    expect(lineFn).toHaveBeenCalledWith(3);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0]).toMatchObject({
      selection: { anchor: 42 },
    });
  });

  it("clamps the line number to the document bounds", () => {
    const { view, lineFn } = fakeView(5, 0);
    scrollViewToLine(view, 99);
    expect(lineFn).toHaveBeenCalledWith(5);
    scrollViewToLine(view, -4);
    expect(lineFn).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/json-editor-navigation.test.ts`
Expected: FAIL — cannot resolve `json-editor-navigation`.

- [ ] **Step 3: Write minimal implementation**

Create `src/resume-editor/ui/json-editor-navigation.ts`:

```ts
import { EditorView } from "@codemirror/view";

export const scrollViewToLine = (view: EditorView, line: number): void => {
  const lineNumber = Math.min(Math.max(line, 1), view.state.doc.lines);
  const info = view.state.doc.line(lineNumber);
  view.dispatch({
    selection: { anchor: info.from },
    effects: EditorView.scrollIntoView(info.from, { y: "center" }),
  });
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/json-editor-navigation.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/resume-editor/ui/json-editor-navigation.ts tests/unit/json-editor-navigation.test.ts
git add src/resume-editor/ui/json-editor-navigation.ts tests/unit/json-editor-navigation.test.ts
git commit -m "feat: add codemirror scroll-to-line helper"
```

---

### Task 3: JsonEditor exposes scrollToLine handle

**Files:**
- Modify: `src/resume-editor/ui/JsonEditor.tsx` (whole file rewrite below)
- Test: `tests/unit/json-editor.test.tsx`

**Interfaces:**
- Consumes: `scrollViewToLine` (Task 2).
- Produces: `export type JsonEditorHandle = { scrollToLine(line: number): void }`. `JsonEditor` is now a `forwardRef<JsonEditorHandle, Props>`; `Props` unchanged (`value`, `diagnostics`, `onChange`).

- [ ] **Step 1: Write the failing test**

Create `tests/unit/json-editor.test.tsx`:

```tsx
// @vitest-environment jsdom
import { createRef } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  JsonEditor,
  type JsonEditorHandle,
} from "../../src/resume-editor/ui/JsonEditor";

describe("JsonEditor", () => {
  it("exposes an imperative scrollToLine handle", () => {
    const ref = createRef<JsonEditorHandle>();
    render(
      <JsonEditor
        ref={ref}
        value={'{\n  "a": 1\n}'}
        diagnostics={[]}
        onChange={() => {}}
      />,
    );
    expect(typeof ref.current?.scrollToLine).toBe("function");
    expect(() => ref.current?.scrollToLine(2)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/json-editor.test.tsx`
Expected: FAIL — `JsonEditorHandle` not exported / ref has no `scrollToLine`.

- [ ] **Step 3: Rewrite JsonEditor**

Replace the entire contents of `src/resume-editor/ui/JsonEditor.tsx`:

```tsx
import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { linter, type Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import type { ValidationDiagnostic } from "../domain/validation-result";
import { scrollViewToLine } from "./json-editor-navigation";

export type JsonEditorHandle = { scrollToLine(line: number): void };

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

export const JsonEditor = forwardRef<JsonEditorHandle, Props>(
  function JsonEditor({ value, diagnostics, onChange }, ref) {
    const editorRef = useRef<ReactCodeMirrorRef>(null);
    useImperativeHandle(ref, () => ({
      scrollToLine(line: number) {
        const view = editorRef.current?.view;
        if (view) scrollViewToLine(view, line);
      },
    }));
    const extensions = useMemo(
      () => [
        json(),
        linter((view) =>
          diagnostics.flatMap(
            (item) => toCodeMirrorDiagnostic(view, item) ?? [],
          ),
        ),
      ],
      [diagnostics],
    );
    return (
      <CodeMirror
        ref={editorRef}
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
  },
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/json-editor.test.tsx`
Expected: PASS.

- [ ] **Step 5: Verify existing tests still pass**

Run: `npm test`
Expected: PASS (all suites green).

- [ ] **Step 6: Commit**

```bash
npx prettier --write src/resume-editor/ui/JsonEditor.tsx tests/unit/json-editor.test.tsx
git add src/resume-editor/ui/JsonEditor.tsx tests/unit/json-editor.test.tsx
git commit -m "feat: expose scrollToLine handle from JsonEditor"
```

---

### Task 4: ErrorDropdown component

**Files:**
- Create: `src/resume-editor/ui/ErrorDropdown.tsx`
- Test: `tests/unit/error-dropdown.test.tsx`

**Interfaces:**
- Consumes: `ValidationDiagnostic` from `../domain/validation-result`.
- Produces: `ErrorDropdown` with props
  `{ id: string; diagnostics: ValidationDiagnostic[]; importError: string | null; persistenceFailed: boolean; onNavigate(line: number): void; onClose(): void }`.
  Renders `role="dialog"`. Navigable rows (with `line`) are `<button>`; lineless rows are non-interactive. Notice rows render first.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/error-dropdown.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorDropdown } from "../../src/resume-editor/ui/ErrorDropdown";

const baseProps = {
  id: "dd",
  importError: null,
  persistenceFailed: false,
  onNavigate: () => {},
  onClose: () => {},
};

describe("ErrorDropdown", () => {
  it("renders notice rows for import and persistence failures", () => {
    render(
      <ErrorDropdown
        {...baseProps}
        importError="Unable to import this file."
        persistenceFailed
        diagnostics={[]}
      />,
    );
    expect(screen.getByText("Unable to import this file.")).toBeTruthy();
    expect(screen.getByText(/Local saving failed/)).toBeTruthy();
  });

  it("navigates when a lined diagnostic is clicked", async () => {
    const onNavigate = vi.fn();
    render(
      <ErrorDropdown
        {...baseProps}
        onNavigate={onNavigate}
        diagnostics={[
          { path: "/", keyword: "syntax", message: "Bad token", line: 4 },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Bad token/ }));
    expect(onNavigate).toHaveBeenCalledWith(4);
  });

  it("renders lineless schema errors as non-interactive rows", () => {
    render(
      <ErrorDropdown
        {...baseProps}
        diagnostics={[
          { path: "/basics/name", keyword: "required", message: "is required" },
        ]}
      />,
    );
    expect(screen.getByText("/basics/name")).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /is required/ }),
    ).toBeNull();
  });

  it("calls onClose from the close button", async () => {
    const onClose = vi.fn();
    render(
      <ErrorDropdown {...baseProps} onClose={onClose} diagnostics={[]} />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/error-dropdown.test.tsx`
Expected: FAIL — cannot resolve `ErrorDropdown`.

- [ ] **Step 3: Write the component**

Create `src/resume-editor/ui/ErrorDropdown.tsx`:

```tsx
import type { ValidationDiagnostic } from "../domain/validation-result";

type Props = {
  id: string;
  diagnostics: ValidationDiagnostic[];
  importError: string | null;
  persistenceFailed: boolean;
  onNavigate(line: number): void;
  onClose(): void;
};

export function ErrorDropdown({
  id,
  diagnostics,
  importError,
  persistenceFailed,
  onNavigate,
  onClose,
}: Props) {
  const count = diagnostics.length;
  return (
    <div
      id={id}
      role="dialog"
      aria-label="Problemas de validación"
      className="error-dropdown"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="error-dropdown-header">
        <span>{`${count} ${count === 1 ? "problema" : "problemas"}`}</span>
        <button type="button" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="error-dropdown-body">
        {importError && <p className="error-notice">{importError}</p>}
        {persistenceFailed && (
          <p className="error-notice">
            Local saving failed. Export your JSON to avoid losing changes.
          </p>
        )}
        {diagnostics.map((item, index) => {
          const label = item.path === "/" ? "JSON" : item.path;
          const key = `${item.path}-${item.keyword}-${index}`;
          if (item.line) {
            const line = item.line;
            return (
              <button
                type="button"
                key={key}
                className="error-row error-row-navigable"
                onClick={() => onNavigate(line)}
              >
                <span className="error-row-label">{label}</span>
                <span className="error-row-message">{item.message}</span>
                <span className="error-row-line">{`L${line}`}</span>
              </button>
            );
          }
          return (
            <div className="error-row" key={key}>
              <span className="error-row-label">{label}</span>
              <span className="error-row-message">{item.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/error-dropdown.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/resume-editor/ui/ErrorDropdown.tsx tests/unit/error-dropdown.test.tsx
git add src/resume-editor/ui/ErrorDropdown.tsx tests/unit/error-dropdown.test.tsx
git commit -m "feat: add ErrorDropdown component"
```

---

### Task 5: ErrorBadge component

**Files:**
- Create: `src/resume-editor/ui/ErrorBadge.tsx`
- Test: `tests/unit/error-badge.test.tsx`

**Interfaces:**
- Consumes: `formatBadgeCount` (Task 1).
- Produces: `ErrorBadge` with props
  `{ count: number; open: boolean; controls: string; onToggle(): void }`. Renders a `<button>` with `aria-haspopup="dialog"`, `aria-expanded`, `aria-controls`. Shows the count only when `count > 0`.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/error-badge.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorBadge } from "../../src/resume-editor/ui/ErrorBadge";

describe("ErrorBadge", () => {
  it("shows the capped count and wires aria state", () => {
    render(
      <ErrorBadge count={150} open controls="dd" onToggle={() => {}} />,
    );
    const button = screen.getByRole("button");
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(button.getAttribute("aria-controls")).toBe("dd");
    expect(screen.getByText("99+")).toBeTruthy();
  });

  it("hides the number when count is zero but stays operable", async () => {
    const onToggle = vi.fn();
    render(
      <ErrorBadge count={0} open={false} controls="dd" onToggle={onToggle} />,
    );
    expect(screen.queryByText("0")).toBeNull();
    await userEvent.click(screen.getByRole("button"));
    expect(onToggle).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/error-badge.test.tsx`
Expected: FAIL — cannot resolve `ErrorBadge`.

- [ ] **Step 3: Write the component**

Create `src/resume-editor/ui/ErrorBadge.tsx`:

```tsx
import { formatBadgeCount } from "./error-widget-utils";

type Props = {
  count: number;
  open: boolean;
  controls: string;
  onToggle(): void;
};

export function ErrorBadge({ count, open, controls, onToggle }: Props) {
  const label = count > 0 ? `Ver ${count} problemas` : "Ver avisos";
  return (
    <button
      type="button"
      className="error-badge"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      onClick={onToggle}
    >
      <span aria-hidden="true">⚠</span>
      {count > 0 && (
        <span className="error-badge-count">{formatBadgeCount(count)}</span>
      )}
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/error-badge.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/resume-editor/ui/ErrorBadge.tsx tests/unit/error-badge.test.tsx
git add src/resume-editor/ui/ErrorBadge.tsx tests/unit/error-badge.test.tsx
git commit -m "feat: add ErrorBadge component"
```

---

### Task 6: ErrorWidget composition (state, live region, auto-close, click-outside)

**Files:**
- Create: `src/resume-editor/ui/ErrorWidget.tsx`
- Test: `tests/unit/error-widget.test.tsx`

**Interfaces:**
- Consumes: `ErrorBadge` (Task 5), `ErrorDropdown` (Task 4), `describeErrorSummary` (Task 1), `ValidationDiagnostic`.
- Produces: `ErrorWidget` with props
  `{ diagnostics: ValidationDiagnostic[]; importError: string | null; persistenceFailed: boolean; onNavigate(line: number): void }`.
  Renders an always-present visually-hidden `role="status" aria-live="polite"` summary. Badge + dropdown appear only when `diagnostics.length > 0 || importError || persistenceFailed`. Navigating or losing all problems closes the dropdown.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/error-widget.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorWidget } from "../../src/resume-editor/ui/ErrorWidget";

const syntax = { path: "/", keyword: "syntax", message: "Bad token", line: 4 };

describe("ErrorWidget", () => {
  it("hides the badge and reports the empty summary when clean", () => {
    render(
      <ErrorWidget
        diagnostics={[]}
        importError={null}
        persistenceFailed={false}
        onNavigate={() => {}}
      />,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Sin errores");
  });

  it("opens the dropdown and navigates, then closes", async () => {
    const onNavigate = vi.fn();
    render(
      <ErrorWidget
        diagnostics={[syntax]}
        importError={null}
        persistenceFailed={false}
        onNavigate={onNavigate}
      />,
    );
    expect(screen.getByRole("status").textContent).toBe(
      "1 error de validación",
    );
    await userEvent.click(screen.getByRole("button", { name: /Ver 1/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: /Bad token/ }));
    expect(onNavigate).toHaveBeenCalledWith(4);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("auto-closes and hides when problems clear", async () => {
    const { rerender } = render(
      <ErrorWidget
        diagnostics={[syntax]}
        importError={null}
        persistenceFailed={false}
        onNavigate={() => {}}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Ver 1/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
    rerender(
      <ErrorWidget
        diagnostics={[]}
        importError={null}
        persistenceFailed={false}
        onNavigate={() => {}}
      />,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/error-widget.test.tsx`
Expected: FAIL — cannot resolve `ErrorWidget`.

- [ ] **Step 3: Write the component**

Create `src/resume-editor/ui/ErrorWidget.tsx`:

```tsx
import { useEffect, useId, useRef, useState } from "react";
import type { ValidationDiagnostic } from "../domain/validation-result";
import { ErrorBadge } from "./ErrorBadge";
import { ErrorDropdown } from "./ErrorDropdown";
import { describeErrorSummary } from "./error-widget-utils";

type Props = {
  diagnostics: ValidationDiagnostic[];
  importError: string | null;
  persistenceFailed: boolean;
  onNavigate(line: number): void;
};

export function ErrorWidget({
  diagnostics,
  importError,
  persistenceFailed,
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const dropdownId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const count = diagnostics.length;
  const hasNotices = importError !== null || persistenceFailed;
  const visible = count > 0 || hasNotices;

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const navigate = (line: number) => {
    onNavigate(line);
    setOpen(false);
  };

  return (
    <div className="error-widget" ref={containerRef}>
      <span className="visually-hidden" role="status" aria-live="polite">
        {describeErrorSummary({ count, hasNotices })}
      </span>
      {visible && (
        <ErrorBadge
          count={count}
          open={open}
          controls={dropdownId}
          onToggle={() => setOpen((value) => !value)}
        />
      )}
      {visible && open && (
        <ErrorDropdown
          id={dropdownId}
          diagnostics={diagnostics}
          importError={importError}
          persistenceFailed={persistenceFailed}
          onNavigate={navigate}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/error-widget.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
npx prettier --write src/resume-editor/ui/ErrorWidget.tsx tests/unit/error-widget.test.tsx
git add src/resume-editor/ui/ErrorWidget.tsx tests/unit/error-widget.test.tsx
git commit -m "feat: add ErrorWidget composition"
```

---

### Task 7: Wire ErrorWidget into ResumeWorkspace, remove ValidationPanel, add styles

**Files:**
- Modify: `src/resume-editor/ui/ResumeWorkspace.tsx`
- Modify: `src/resume-editor/ui/editor.css`
- Delete: `src/resume-editor/ui/ValidationPanel.tsx`
- Test: `tests/unit/resume-workspace.test.tsx`

**Interfaces:**
- Consumes: `ErrorWidget` (Task 6), `JsonEditorHandle` (Task 3).
- Produces: the wired app. `ResumeWorkspace` holds `jsonEditorRef`, passes it to `JsonEditor`, and renders `<ErrorWidget onNavigate={(line) => jsonEditorRef.current?.scrollToLine(line)} />` in the toolbar. No `ValidationPanel` remains.

- [ ] **Step 1: Write the failing test**

Create `tests/unit/resume-workspace.test.tsx`:

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ResumeWorkspace } from "../../src/resume-editor/ui/ResumeWorkspace";
import { AjvResumeValidator } from "../../src/resume-editor/adapters/validation/ajv-resume-validator";
import type { StoredDraft } from "../../src/resume-editor/application/ports/draft-repository";

const deps = (rawText: string) => ({
  validator: new AjvResumeValidator(),
  draftRepository: {
    load: vi.fn<() => StoredDraft | null>(() => ({
      version: 1,
      rawText,
      selectedTemplate: "editorial",
    })),
    save: vi.fn(),
    clear: vi.fn(),
  },
  fileGateway: { read: vi.fn(), download: vi.fn() },
  printGateway: { print: vi.fn() },
});

describe("ResumeWorkspace error surface", () => {
  it("shows the error badge for invalid JSON and no legacy panel", () => {
    render(<ResumeWorkspace dependencies={deps("{")} />);
    expect(screen.getByRole("button", { name: /Ver 1 problemas/ })).toBeTruthy();
    expect(document.querySelector(".validation-panel")).toBeNull();
  });

  it("hides the badge for valid JSON", () => {
    render(
      <ResumeWorkspace
        dependencies={deps('{"basics":{"name":"Ok"}}')}
      />,
    );
    expect(screen.queryByRole("button", { name: /Ver .* problemas/ })).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/resume-workspace.test.tsx`
Expected: FAIL — badge not rendered (still legacy panel).

- [ ] **Step 3: Update ResumeWorkspace imports**

In `src/resume-editor/ui/ResumeWorkspace.tsx`, change the import block. Replace:

```tsx
import { useEffect, useDeferredValue, useState } from "react";
```
with:
```tsx
import { useEffect, useDeferredValue, useRef, useState } from "react";
```

Replace:
```tsx
import { JsonEditor } from "./JsonEditor";
import { TemplateSelector } from "./TemplateSelector";
import { ErrorBoundary } from "./ErrorBoundary";
import { ValidationPanel } from "./ValidationPanel";
```
with:
```tsx
import { JsonEditor, type JsonEditorHandle } from "./JsonEditor";
import { TemplateSelector } from "./TemplateSelector";
import { ErrorBoundary } from "./ErrorBoundary";
import { ErrorWidget } from "./ErrorWidget";
```

- [ ] **Step 4: Add the editor ref**

Immediately after the line `const Template = templateRegistry[editor.state.selectedTemplate];` add:

```tsx
  const jsonEditorRef = useRef<JsonEditorHandle>(null);
```

- [ ] **Step 5: Render ErrorWidget in the toolbar**

In the toolbar, replace this block:

```tsx
          <div className="editor-actions">
            <label className="file-action">
              Import JSON
```
with:
```tsx
          <ErrorWidget
            diagnostics={editor.state.diagnostics}
            importError={editor.importError}
            persistenceFailed={editor.state.persistenceStatus === "failed"}
            onNavigate={(line) => jsonEditorRef.current?.scrollToLine(line)}
          />
          <div className="editor-actions">
            <label className="file-action">
              Import JSON
```

- [ ] **Step 6: Pass the ref to JsonEditor and drop ValidationPanel**

Replace this block:

```tsx
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
```
with:
```tsx
            <JsonEditor
              ref={jsonEditorRef}
              value={editor.state.rawText}
              diagnostics={editor.state.diagnostics}
              onChange={editor.changeDraft}
            />
```

- [ ] **Step 7: Delete the legacy component**

```bash
git rm src/resume-editor/ui/ValidationPanel.tsx
```

- [ ] **Step 8: Update CSS**

In `src/resume-editor/ui/editor.css`, delete the `.validation-panel` rule block (the 7 lines beginning `.validation-panel {` and ending with its closing `}`). Then, in the `@media print` block, remove the single line `  .validation-panel,` from the selector list.

Append to the end of `editor.css`:

```css
.error-widget {
  position: relative;
  display: flex;
  align-items: center;
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
.error-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.15rem 0.6rem;
  border: none;
  border-radius: 999px;
  background: #dc2626;
  color: white;
  font-weight: 600;
  cursor: pointer;
}
.error-badge-count {
  font-variant-numeric: tabular-nums;
}
.error-dropdown {
  position: absolute;
  top: calc(100% + 0.4rem);
  right: 0;
  width: min(360px, calc(100vw - 1.5rem));
  max-height: 300px;
  overflow-y: auto;
  z-index: 50;
  background: #1e293b;
  border: 1px solid #334155;
  border-radius: 0.5rem;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  color: #e2e8f0;
  font-size: 0.85rem;
}
.error-dropdown-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #334155;
  font-weight: 600;
  color: #fca5a5;
}
.error-dropdown-header button {
  border: none;
  background: transparent;
  color: #94a3b8;
  font-size: 1rem;
  cursor: pointer;
}
.error-dropdown-body {
  display: flex;
  flex-direction: column;
}
.error-notice {
  margin: 0;
  padding: 0.5rem 0.75rem;
  background: #422006;
  color: #fed7aa;
  border-bottom: 1px solid #334155;
  font-size: 0.8rem;
}
.error-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  align-items: baseline;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid #263145;
  text-align: left;
  background: transparent;
  border-left: none;
  border-right: none;
  border-top: none;
  color: inherit;
  font: inherit;
  width: 100%;
}
.error-row-navigable {
  cursor: pointer;
}
.error-row-navigable:hover {
  background: #263145;
}
.error-row-label {
  color: #7dd3fc;
  font-family: "SF Mono", "Menlo", monospace;
  font-size: 0.75rem;
}
.error-row-message {
  flex: 1;
  min-width: 8rem;
}
.error-row-line {
  color: #94a3b8;
  font-size: 0.75rem;
}
```

- [ ] **Step 9: Run the workspace test and full suite**

Run: `npx vitest run tests/unit/resume-workspace.test.tsx`
Expected: PASS (2 tests).

Run: `npm test`
Expected: PASS (all suites).

- [ ] **Step 10: Type-check**

Run: `npx astro check`
Expected: 0 errors.

- [ ] **Step 11: Commit**

```bash
npx prettier --write src/resume-editor/ui/ResumeWorkspace.tsx src/resume-editor/ui/editor.css tests/unit/resume-workspace.test.tsx
git add -A
git commit -m "feat: replace ValidationPanel with toolbar error widget"
```

---

### Task 8: End-to-end coverage and docs

**Files:**
- Modify: `tests/e2e/editor.spec.ts`
- Modify: `docs/ARCHITECTURE.md:31`

**Interfaces:**
- Consumes: the wired app (Task 7).
- Produces: an e2e test proving the badge appears, opens, and clears; updated architecture docs.

- [ ] **Step 1: Add the e2e test**

Append to `tests/e2e/editor.spec.ts`:

```ts
test("surfaces validation errors through the toolbar badge", async ({
  page,
}) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type("{");
  const badge = page.getByRole("button", { name: /Ver \d+ problemas/ });
  await expect(badge).toBeVisible();
  await badge.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.type('{"basics":{"name":"Fixed"}}');
  await expect(badge).toHaveCount(0);
});
```

- [ ] **Step 2: Run the e2e suite**

Run: `npm run test:e2e`
Expected: PASS (all tests including the new one).

- [ ] **Step 3: Update the architecture doc**

In `docs/ARCHITECTURE.md`, replace the `ValidationPanel.tsx` table row (line 31):

```
| `ValidationPanel.tsx`  | Muestra errores de validación JSON debajo del editor                                                                                |
```
with:
```
| `ErrorWidget.tsx`      | Badge de errores en la toolbar que abre un dropdown con diagnósticos, errores de importación y fallos de guardado                    |
| `ErrorBadge.tsx`       | Botón/contador de errores en la toolbar (aria-expanded/controls)                                                                     |
| `ErrorDropdown.tsx`    | Panel flotante con la lista de problemas; filas con línea navegan en el editor                                                       |
```

- [ ] **Step 4: Commit**

```bash
npx prettier --write tests/e2e/editor.spec.ts
git add tests/e2e/editor.spec.ts docs/ARCHITECTURE.md
git commit -m "test: cover toolbar error badge e2e and update docs"
```

- [ ] **Step 5: Full verification**

Run: `npm run test:all`
Expected: unit + pdf + e2e + build + generated-types check all PASS.

---

## Notes / Out of Scope

- Mapping AJV schema errors to source line/column (would make schema rows navigable) — future enhancement.
- Deduplicating redundant `anyOf`/`oneOf` diagnostics — future enhancement.
- The widget lives inside `.editor-toolbar`, which `@media print` already hides, so the dropdown never prints; no extra print rule is required beyond removing the stale `.validation-panel` selector.
