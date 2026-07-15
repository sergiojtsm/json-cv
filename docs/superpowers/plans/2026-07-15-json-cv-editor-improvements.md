# JSON CV Editor Improvements — Implementation Plan

> **For agentic workers:** Use subagent-driven-development or executing-plans to implement task-by-task.

**Goal:** Fix print, clean up routes, add example loader + placeholder, and implement sticky header with independent scroll panels.

**Architecture:** Single-page Astro+React app. All changes are in the editor page (`editor.astro`), its React component (`ResumeWorkspace.tsx`), and CSS (`editor.css`). The root page becomes a redirect.

**Tech Stack:** Astro 7, React 19, CodeMirror, CSS Grid/Flexbox

## Global Constraints

- Use existing `completeResume` fixture for the example button
- The `changeDraft` method on the editor hook accepts a raw JSON string
- All CSS changes go in `editor.css` (print, layout, sticky, scroll)
- Keep feasibility routes until print is verified working

---

### Task 1: Fix print (astro-island)

**Files:**

- Modify: `src/resume-editor/ui/editor.css` — add `astro-island { display: block; }` inside `@media print`

**Interfaces:**

- Consumes: existing `@media print` block in `editor.css`
- Produces: `<astro-island>` becomes a proper block container during print so the browser's PDF engine includes its children

- [ ] **Step 1: Add astro-island print rule**

In `src/resume-editor/ui/editor.css`, inside the `@media print` block, add `astro-island { display: block; }` before the existing rules:

```css
@media print {
  astro-island {
    display: block;
  }
  .editor-toolbar,
  .editor-pane,
  ...
```

- [ ] **Step 2: Verify with existing e2e test**

Run: `npm run test:e2e`
Expected: The "print media hides editor chrome" test passes (it checks the DOM under print media emulation)

---

### Task 2: Redirect root to /editor/

**Files:**

- Modify: `src/pages/index.astro` — replace content with redirect

**Interfaces:**

- Consumes: Astro static output config
- Produces: `/` redirects to `/editor/`

- [ ] **Step 1: Rewrite index.astro**

Replace the entire file content with:

```astro
---
return Astro.redirect("/editor/", 301);
---
```

- [ ] **Step 2: Verify build**

Run: `npm run build`
Expected: Build succeeds

---

### Task 3: Load example button

**Files:**

- Modify: `src/resume-editor/ui/ResumeWorkspace.tsx` — add button and handler
- Test: `tests/e2e/editor.spec.ts` — add e2e test for load example

**Interfaces:**

- Consumes: `completeResume` from `resume-fixtures/resumes`, `editor.changeDraft(rawText: string)` from `useResumeEditor`
- Produces: "Load example" button visible in toolbar; clicking loads `completeResume` formatted JSON

- [ ] **Step 1: Write failing e2e test**

Add to `tests/e2e/editor.spec.ts`:

```typescript
test("loads example resume JSON", async ({ page }) => {
  const editor = page.locator(".cm-content");
  await editor.click();
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(
    page.getByTestId("resume-preview").getByText("Alex Morgan"),
  ).toBeVisible();
  await expect(
    page.getByTestId("resume-preview").getByText("Senior Frontend Engineer"),
  ).toBeVisible();
});
```

- [ ] **Step 2: Run e2e to confirm it fails**

Run: `npm run test:e2e`
Expected: Fails — "Load example" button not found

- [ ] **Step 3: Add import and handler in ResumeWorkspace**

In `src/resume-editor/ui/ResumeWorkspace.tsx`:

Add import:

```typescript
import { completeResume } from "../../resume-fixtures/resumes";
```

Add `loadExample` handler inside the component (before the return):

```typescript
const loadExample = () => {
  if (
    editor.state.rawText &&
    !window.confirm("Replace current content with the example?")
  )
    return;
  editor.changeDraft(JSON.stringify(completeResume, null, 2));
};
```

- [ ] **Step 4: Add button in the toolbar**

In the JSX, inside `<div className="editor-actions">`, after the "Clear local data" button, add:

```tsx
<button type="button" onClick={loadExample}>
  Load example
</button>
```

- [ ] **Step 5: Run e2e test to verify**

Run: `npm run test:e2e`
Expected: All tests pass

---

### Task 4: Empty-state placeholder in editor

**Files:**

- Modify: `src/resume-editor/ui/ResumeWorkspace.tsx` — add placeholder when empty
- Modify: `src/resume-editor/ui/editor.css` — add placeholder styles

**Interfaces:**

- Consumes: `editor.state.status` from `useResumeEditor`
- Produces: Placeholder overlay visible when editor is empty with link to jsonresume.org

- [ ] **Step 1: Add placeholder element in ResumeWorkspace**

In the `<section className="editor-pane">`, before `<JsonEditor />`, add:

```tsx
{
  editor.state.status === "empty" && (
    <div className="editor-placeholder">
      <p>
        Paste your JSON Resume or import a file. The format follows the{" "}
        <a
          href="https://jsonresume.org/schema/"
          target="_blank"
          rel="noopener noreferrer"
        >
          jsonresume.org
        </a>{" "}
        schema.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Add placeholder styles in editor.css**

Add:

```css
.editor-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #9ca3af;
  font-size: 0.95rem;
  text-align: center;
  pointer-events: none;
}
.editor-placeholder a {
  pointer-events: auto;
  color: #60a5fa;
}
```

Note: `.editor-pane` needs `position: relative` for the absolute positioning to work. Add:

```css
.editor-pane {
  position: relative;
  min-width: 0;
  background: #111827;
}
```

- [ ] **Step 3: Add test for placeholder**

Add to `tests/e2e/editor.spec.ts`:

```typescript
test("shows placeholder when editor is empty", async ({ page }) => {
  await expect(page.getByText(/Paste your JSON Resume/i)).toBeVisible();
  await expect(page.getByText("jsonresume.org")).toBeVisible();
  await page.getByRole("button", { name: "Load example" }).click();
  await expect(page.getByText(/Paste your JSON Resume/i)).toHaveCount(0);
});
```

- [ ] **Step 4: Run e2e test to verify**

Run: `npm run test:e2e`
Expected: All tests pass

---

### Task 5: Sticky toolbar + independent scroll panels

**Files:**

- Modify: `src/resume-editor/ui/editor.css` — sticky toolbar, scroll layout
- Modify: `src/resume-editor/ui/ResumeWorkspace.tsx` — structure adjustments if needed

**Interfaces:**

- Consumes: existing grid layout markup
- Produces: toolbar sticky, editor and preview scroll independently

- [ ] **Step 1: Update CSS in editor.css**

Replace the existing `.editor-toolbar`, `.editor-workspace`, `.editor-pane`, `.preview-pane` rules:

```css
.editor-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  color: white;
  background: #172033;
}

.editor-workspace {
  display: grid;
  grid-template-columns: minmax(22rem, 42%) minmax(0, 1fr);
  height: calc(100vh - 3.5rem); /* viewport minus toolbar */
  overflow: hidden;
}

.editor-pane {
  position: relative;
  min-width: 0;
  overflow-y: auto;
  background: #111827;
}

.preview-pane {
  min-width: 0;
  overflow-y: auto;
  padding: 2rem;
}
```

- [ ] **Step 2: Update print media query for new layout**

In the existing `@media print` block in `editor.css`, ensure the print override is correct — the `.editor-workspace` should still get `display: block; min-height: 0;` during print:

```css
@media print {
  astro-island {
    display: block;
  }
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
    height: auto;
    padding: 0;
    overflow: visible;
    background: white;
  }
}
```

Note: Added `height: auto` to override the new `height: calc(100vh - 3.5rem)` on `.editor-workspace` during print.

- [ ] **Step 3: Run e2e tests**

Run: `npm run test:e2e`
Expected: All tests pass (the mobile tabs test checks `.editor-pane` display, which should still work)

- [ ] **Step 4: Run unit tests**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 5: Run build to verify**

Run: `npm run build`
Expected: Build succeeds
