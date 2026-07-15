# Error Visualization Redesign

## Problem

`ValidationPanel` renders below the CodeMirror editor inside `.editor-pane` (left column). When the JSON grows, the pane scrolls and the error list gets pushed out of view — users must scroll to see validation feedback, which hurts usability.

## Chosen Approach: Toolbar Badge + Dropdown (Option B)

An always-visible error badge in the toolbar plus a floating dropdown panel opened on click. The editor grid layout stays unchanged. Existing CodeMirror inline linting is preserved.

### Why Not the Others

- **A. Panel lateral fijo**: robs vertical space from the editor; competes with CodeMirror height.
- **C. Toast only**: no persistent full list; existing AJV diagnostics lack line/column, so inline-only loses information.

## Error Sources (complete inventory)

The current `ValidationPanel` surfaces **three distinct signals**. The redesign must preserve all three — not just `diagnostics`.

| Source | Origin | Has line/col? | Navigable? |
|---|---|---|---|
| `diagnostics` (syntax) | `evaluateResumeDraft` on `JSON.parse` failure — always exactly 1 | Yes (via `getJsonSyntaxErrorLocation`) | Yes |
| `diagnostics` (schema) | AJV `validate` — 0..N, `allErrors: true` | **No** (`toDiagnostic` does not set line/col) | No (see Decision 2) |
| `importError` | `useResumeEditor.importFile` catch — string or null | No | No |
| `persistenceFailed` | `state.persistenceStatus === "failed"` | No | No |

`importError` currently has **no other UI surface** — dropping it would remove the only place the user sees import failures. `persistenceFailed` also appears as toolbar status text, but its actionable detail ("Export your JSON to avoid losing changes") lives only in the panel.

## Design Decisions

### Decision 1 — Badge count and content

The badge shows the count of **schema/syntax diagnostics only** (`⚠ N`). `importError` and `persistenceFailed` are **not** counted as validation errors but are still rendered inside the dropdown as distinct, pinned notice rows at the top (different styling: info/warning, no line number, not clickable-to-navigate).

- If `N === 0` **and** no `importError` **and** not `persistenceFailed` → badge hidden entirely.
- If `N === 0` but there is an `importError`/`persistenceFailed` → badge still shows using a neutral icon (e.g. `⚠`) with no number, so the notice is reachable.
- Count cap: display `99+` when `N > 99`.

### Decision 2 — Click-to-navigate behavior

- Rows **with** a line number (syntax error): clickable; clicking scrolls CodeMirror to that line and closes the dropdown. Cursor `pointer`.
- Rows **without** a line (schema errors, importError, persistenceFailed): not navigable. Rendered with default cursor, no hover-navigate affordance. They still display path + message.
- Out of scope for this change: enriching AJV schema errors with line numbers (would require a JSON source-map from `instancePath`). Noted as a future enhancement, not implemented here.

### Decision 3 — Accessibility (no regression vs `role="alert"`)

The current panel uses `role="alert"`, so screen readers announce errors automatically. A dropdown hidden behind a badge would not. To preserve announcement:

- Keep a **visually-hidden live region** (`aria-live="polite"`, `role="status"`) that always reflects a short summary, e.g. "2 errores de validación" or "Sin errores". This announces changes even when the dropdown is closed.
- Badge is a `<button>` with `aria-expanded`, `aria-controls`, `aria-haspopup="dialog"`, and an accessible label ("Ver 2 problemas").
- Dropdown container is focusable; `Escape` closes it and returns focus to the badge. `Enter`/`Space` on the badge toggles it.
- Each navigable error row is a `<button>` for keyboard operability.

### Decision 4 — Print

Add the new component's class to the existing `@media print` hide list in `editor.css` (alongside `.validation-panel` removal) so errors never leak into the printed/PDF output.

### Decision 5 — Responsive / mobile

- Dropdown width: `min(360px, calc(100vw - 1.5rem))` so it never overflows narrow viewports.
- Anchored to the toolbar's right edge; on very small screens it may span most of the width. Verify it is not clipped by the sticky toolbar (`z-index: 10`) or by `html, body { overflow: hidden }` — the dropdown must render with sufficient `z-index` (e.g. `z-index: 50`) and, if clipping occurs, be portaled to `document.body` or positioned as a child of `.editor-app` rather than inside the toolbar's stacking context.

### Decision 6 — Live state transitions

- While the dropdown is open and the user types: the list re-renders live from `diagnostics`.
- If the error count drops to 0 (and no notices remain), the badge hides and the dropdown auto-closes.
- Opening/closing is local UI state (`useState`) in the new component; it does not touch editor domain state.

### Decision 7 — Noise reduction (schema errors)

AJV with `allErrors: true` + `anyOf`/`oneOf` schemas can emit many redundant diagnostics. For this change we render them as-is (no dedup) to avoid scope creep, but the dropdown is scrollable (`max-height: 300px`) and the count is capped. Dedup/grouping is a noted future enhancement.

## Components

- `src/resume-editor/ui/ErrorBadge.tsx` — the toolbar `<button>` badge (count, aria wiring). Hidden when nothing to show.
- `src/resume-editor/ui/ErrorDropdown.tsx` — the floating panel: notice rows (import/persistence) + diagnostic rows, dark theme, scrollable, Escape/focus handling.
- `src/resume-editor/ui/ErrorSummaryLiveRegion.tsx` — visually-hidden `aria-live` summary (or folded into the badge component).
- `src/resume-editor/ui/ErrorWidget.tsx` — parent that owns open/close state and composes badge + dropdown + live region. Receives `diagnostics`, `importError`, `persistenceFailed`, and an `onNavigate(line: number)` callback.

`ValidationPanel.tsx` is removed.

## Data Flow

`ResumeWorkspace` already holds `editor.state.diagnostics`, `editor.importError`, `editor.state.persistenceStatus`. It renders `<ErrorWidget>` inside the toolbar (replacing the current `role="status"` span's error duties is out of scope — the persistence status text stays; the widget adds the detailed surface). `onNavigate` is wired to a CodeMirror ref/imperative scroll (new: `JsonEditor` must expose a way to scroll to a line, e.g. via a `ref` or a `scrollToLine` prop/callback).

## Implementation Steps

1. Extend `JsonEditor` to expose line navigation (imperative handle or controlled `scrollToLine`).
2. Create `ErrorBadge`, `ErrorDropdown`, live region, and `ErrorWidget`.
3. Wire `ErrorWidget` into `ResumeWorkspace` toolbar; pass diagnostics/importError/persistenceFailed and `onNavigate`.
4. Remove `<ValidationPanel>` usage and delete `ValidationPanel.tsx`.
5. Add CSS to `editor.css`: badge, dropdown (dark theme, responsive width, z-index), print hiding; remove `.validation-panel` rules.
6. Add click-outside + `Escape` to close; focus management.
7. Update `docs/ARCHITECTURE.md` (ValidationPanel row → new components).
8. Update/replace tests that reference the old panel; add tests for badge count, notice rows, navigate-on-click, empty state, and a11y live region.

## Files Affected

- `src/resume-editor/ui/ResumeWorkspace.tsx` — toolbar renders `<ErrorWidget>`; remove `ValidationPanel` import/usage; wire `onNavigate`.
- `src/resume-editor/ui/JsonEditor.tsx` — expose line-scroll capability.
- `src/resume-editor/ui/editor.css` — new styles; remove `.validation-panel` rules; update `@media print`.
- `src/resume-editor/ui/ErrorWidget.tsx`, `ErrorBadge.tsx`, `ErrorDropdown.tsx` (+ live region) — new files.
- `src/resume-editor/ui/ValidationPanel.tsx` — deleted.
- `docs/ARCHITECTURE.md` — component table update.
- `tests/**` — update panel-dependent assertions; add widget tests.

## Out of Scope (future enhancements)

- Mapping AJV schema errors to source line/column (JSON source-map).
- Deduplicating/grouping redundant `anyOf`/`oneOf` diagnostics.
- Warning severity level (system currently has errors only).

## Testing Strategy

- **Unit (vitest + Testing Library)**: badge visibility for the empty/valid/invalid/import-error/persistence-failed states; count cap `99+`; notice rows render for import/persistence; navigable vs non-navigable rows; live-region summary text; dropdown Escape/close.
- **Integration/e2e (playwright)**: type invalid JSON → badge appears → open dropdown → click syntax error → editor scrolls to line; fix errors → badge hides + dropdown closes.
- Verify no test still queries `.validation-panel` / old `role="alert"` panel.
