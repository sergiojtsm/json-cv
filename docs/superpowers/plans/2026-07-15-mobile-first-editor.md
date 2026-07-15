# Mobile-first Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the JSON CV editor mobile-first so the CV preview scrolls on mobile, the header no longer overlaps the menus, and the A4 preview fits the phone width.

**Architecture:** Rewrite `editor.css` with a mobile-first cascade (base = mobile, `@media (min-width: 800px)` adds the desktop 2-column grid). Keep the flex height-chain intact on mobile so the active pane owns its own scroll. Scale the fixed A4 `.resume-page` to fit width using CSS `zoom` driven by a JS-measured `--preview-scale` custom property.

**Tech Stack:** Astro 7, React 19, plain CSS, Vitest (jsdom) for units, Playwright for e2e.

## Global Constraints

- Node `>=22.12.0`.
- No new dependencies.
- Print path (`@media print`) must remain untouched — it keeps rendering the real A4 page.
- The mobile tab behaviour (`.mobile-tabs`, `data-mobile-hidden` → `display: none`) must be preserved; e2e test `uses Editor and Preview tabs on mobile` (viewport 390px) must still pass.
- Desktop layout (2-column grid, both panes visible) and the print e2e test must still pass.
- Unit tests run under jsdom, which has no `ResizeObserver` — any observer usage must be feature-guarded.

---

### Task 1: Fix viewport meta

**Files:**
- Modify: `src/pages/editor.astro` (the `<meta name="viewport" ...>` line)

**Interfaces:**
- Consumes: nothing.
- Produces: correct mobile scaling for all subsequent CSS work.

- [ ] **Step 1: Edit the viewport meta**

In `src/pages/editor.astro`, change:

```html
<meta name="viewport" content="width=device-width" />
```

to:

```html
<meta name="viewport" content="width=device-width, initial-scale=1" />
```

- [ ] **Step 2: Verify the build still succeeds**

Run: `npm run build`
Expected: build completes without errors.

- [ ] **Step 3: Commit**

```bash
git add src/pages/editor.astro
git commit -m "fix: add initial-scale to editor viewport meta"
```

---

### Task 2: Mobile-first layout + preview scroll fix

Rewrite `editor.css` so the base cascade targets mobile and keeps the flex height-chain so the active pane scrolls. Desktop layout moves under `@media (min-width: 800px)`.

**Files:**
- Modify: `src/resume-editor/ui/editor.css` (lines 1-124, the layout block up to and including the print block; leave the `.error-widget`/`.error-*` block at 125-233 unchanged)
- Test: `tests/e2e/editor.spec.ts` (add one test)

**Interfaces:**
- Consumes: existing markup classes `.editor-app`, `.editor-toolbar`, `.editor-actions`, `.file-action`, `.mobile-tabs`, `.editor-workspace`, `.editor-pane`, `.preview-pane`, and the `data-mobile-hidden` attribute (all already emitted by `ResumeWorkspace.tsx`).
- Produces: mobile-first layout where `.editor-workspace` stays `display: flex` (column) on mobile, so `.preview-pane` / `.editor-pane` have bounded height and their `overflow-y: auto` scrolls. Reserves the `--preview-scale` custom property consumed in Task 4.

- [ ] **Step 1: Write the failing e2e test**

Add to `tests/e2e/editor.spec.ts`:

```ts
test("preview pane scrolls independently on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".cm-content").click();
  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("tab", { name: "Preview" }).click();
  const pane = page.locator(".preview-pane");
  await expect(pane).toBeVisible();
  const canScroll = await pane.evaluate(
    (el) => el.scrollHeight > el.clientHeight,
  );
  expect(canScroll).toBe(true);
  await pane.evaluate((el) => {
    el.scrollTop = 200;
  });
  const scrolled = await pane.evaluate((el) => el.scrollTop);
  expect(scrolled).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/e2e/editor.spec.ts -g "preview pane scrolls independently on mobile"`
Expected: FAIL — `scrolled` is `0` because the current mobile `display: block` workspace does not give the pane a bounded scroll height.

- [ ] **Step 3: Rewrite the layout section of `editor.css`**

Replace lines 1-124 of `src/resume-editor/ui/editor.css` (everything from the opening `html,` rule down to and including the closing `}` of the `@media print { ... }` block) with:

```css
html,
body {
  height: 100%;
  overflow: hidden;
}
.editor-app {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  background: #eef1f4;
  color: #172033;
}
.editor-toolbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem 0.75rem;
  color: white;
  background: #172033;
}
.editor-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}
.editor-actions button,
.file-action {
  font-size: 0.85rem;
  padding: 0.35rem 0.6rem;
}
.file-action {
  cursor: pointer;
  border: 1px solid currentColor;
  border-radius: 0.35rem;
}
.mobile-tabs {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
}
.editor-workspace {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.editor-pane,
.preview-pane {
  min-width: 0;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
.editor-pane {
  position: relative;
  background: #111827;
}
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
.preview-pane {
  padding: 0.75rem;
}
.stale-preview {
  margin: 0 0 0.75rem;
  padding: 0.5rem;
  background: #fff7d6;
}
.editor-pane[data-mobile-hidden="true"],
.preview-pane[data-mobile-hidden="true"] {
  display: none;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
@media (min-width: 800px) {
  .editor-actions button,
  .file-action {
    font-size: inherit;
  }
  .mobile-tabs {
    display: none;
  }
  .editor-workspace {
    display: grid;
    grid-template-columns: minmax(22rem, 42%) minmax(0, 1fr);
  }
  .editor-pane[data-mobile-hidden="true"],
  .preview-pane[data-mobile-hidden="true"] {
    display: block;
  }
  .preview-pane {
    padding: 2rem;
  }
}
@media print {
  html,
  body {
    height: auto;
    overflow: visible;
  }
  astro-island {
    display: block !important;
  }
  .editor-toolbar,
  .editor-pane,
  .mobile-tabs,
  .template-selector,
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

- [ ] **Step 4: Run the new e2e test to verify it passes**

Run: `npx playwright test tests/e2e/editor.spec.ts -g "preview pane scrolls independently on mobile"`
Expected: PASS.

- [ ] **Step 5: Run the full e2e suite to verify no regressions**

Run: `npx playwright test tests/e2e/editor.spec.ts`
Expected: all tests PASS (including `uses Editor and Preview tabs on mobile` and `print media hides editor chrome and keeps the preview`).

- [ ] **Step 6: Commit**

```bash
git add src/resume-editor/ui/editor.css tests/e2e/editor.spec.ts
git commit -m "feat: make editor layout mobile-first and fix preview scroll"
```

---

### Task 3: Header wraps without overlapping on mobile

The CSS from Task 2 already gives `.editor-toolbar` and `.editor-actions`
`flex-wrap: wrap`. This task adds an e2e guard proving the header no longer
overlaps the content below it on a narrow viewport.

**Files:**
- Test: `tests/e2e/editor.spec.ts` (add one test)
- Modify (only if the test fails): `src/resume-editor/ui/editor.css`

**Interfaces:**
- Consumes: the mobile-first toolbar rules from Task 2.
- Produces: verified non-overlapping header at 390px width.

- [ ] **Step 1: Write the failing/guard e2e test**

Add to `tests/e2e/editor.spec.ts`:

```ts
test("toolbar wraps and does not overlap the tabs on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const toolbar = page.locator(".editor-toolbar");
  const tabs = page.locator(".mobile-tabs");
  await expect(toolbar).toBeVisible();
  await expect(tabs).toBeVisible();
  const toolbarBox = await toolbar.boundingBox();
  const tabsBox = await tabs.boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(tabsBox).not.toBeNull();
  // The tabs start at or below the bottom of the (possibly wrapped) toolbar.
  expect(tabsBox!.y).toBeGreaterThanOrEqual(
    toolbarBox!.y + toolbarBox!.height - 1,
  );
});
```

- [ ] **Step 2: Run the test**

Run: `npx playwright test tests/e2e/editor.spec.ts -g "toolbar wraps and does not overlap"`
Expected: PASS with the Task 2 CSS. If it FAILS (overlap detected), continue to Step 3; otherwise skip to Step 4.

- [ ] **Step 3: (Only if Step 2 failed) tighten the toolbar spacing**

In `src/resume-editor/ui/editor.css`, inside the base `.editor-toolbar` rule,
reduce the horizontal padding to give the wrapped rows more room:

```css
  padding: 0.5rem 0.6rem;
```

Then re-run Step 2 until it passes.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/editor.spec.ts src/resume-editor/ui/editor.css
git commit -m "test: guard mobile toolbar wrap against overlap"
```

---

### Task 4: Scale the A4 preview to fit mobile width

Add a pure, unit-tested helper that computes the scale factor, wire it into
`ResumeWorkspace` with a `ResizeObserver` that sets a `--preview-scale` CSS
custom property, and apply it via CSS `zoom` on mobile.

**Files:**
- Create: `src/resume-editor/ui/preview-scale.ts`
- Create: `tests/unit/preview-scale.test.ts`
- Modify: `src/resume-editor/ui/ResumeWorkspace.tsx`
- Modify: `src/resume-editor/ui/editor.css`

**Interfaces:**
- Consumes: the `[data-testid="resume-preview"]` element rendered by `ResumeWorkspace`, and the `--preview-scale` property reserved in Task 2.
- Produces:
  - `A4_WIDTH_PX: number` (constant `793.7`).
  - `computePreviewScale(containerWidth: number, pageWidth?: number): number`
    returning `Math.min(1, containerWidth / pageWidth)`, and `1` for
    non-finite / non-positive `containerWidth`.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/preview-scale.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  A4_WIDTH_PX,
  computePreviewScale,
} from "../../src/resume-editor/ui/preview-scale";

describe("computePreviewScale", () => {
  it("scales down when the container is narrower than the page", () => {
    expect(computePreviewScale(400)).toBeCloseTo(400 / A4_WIDTH_PX, 5);
  });

  it("never scales above 1 when the container is wide", () => {
    expect(computePreviewScale(2000)).toBe(1);
  });

  it("returns 1 for non-positive or non-finite widths", () => {
    expect(computePreviewScale(0)).toBe(1);
    expect(computePreviewScale(-50)).toBe(1);
    expect(computePreviewScale(Number.NaN)).toBe(1);
  });

  it("honours a custom page width", () => {
    expect(computePreviewScale(300, 600)).toBeCloseTo(0.5, 5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/preview-scale.test.ts`
Expected: FAIL — module `preview-scale` does not exist.

- [ ] **Step 3: Implement the helper**

Create `src/resume-editor/ui/preview-scale.ts`:

```ts
// 210mm (A4 width) at 96dpi = 210 * 96 / 25.4 ≈ 793.7px
export const A4_WIDTH_PX = 793.7;

export function computePreviewScale(
  containerWidth: number,
  pageWidth: number = A4_WIDTH_PX,
): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return 1;
  return Math.min(1, containerWidth / pageWidth);
}
```

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `npx vitest run tests/unit/preview-scale.test.ts`
Expected: PASS.

- [ ] **Step 5: Wire the observer into `ResumeWorkspace.tsx`**

In `src/resume-editor/ui/ResumeWorkspace.tsx`:

Add the import near the other UI imports (after the `ErrorWidget` import):

```ts
import { computePreviewScale } from "./preview-scale";
```

Add a ref alongside `jsonEditorRef` (after line 30, `const jsonEditorRef = useRef<JsonEditorHandle>(null);`):

```ts
  const previewRef = useRef<HTMLDivElement>(null);
```

Add this effect after the existing `useEffect` keyboard block (after line 70):

```ts
  useEffect(() => {
    const el = previewRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const apply = () => {
      const scale = computePreviewScale(el.clientWidth);
      el.style.setProperty("--preview-scale", String(scale));
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
```

Attach the ref to the preview container. Change the line:

```tsx
            <div data-testid="resume-preview">
```

to:

```tsx
            <div data-testid="resume-preview" ref={previewRef}>
```

- [ ] **Step 6: Apply the scale via CSS `zoom`**

In `src/resume-editor/ui/editor.css`, add this rule immediately after the base
`.preview-pane { padding: 0.75rem; }` rule (still in the mobile-first base
section):

```css
[data-testid="resume-preview"] .resume-page {
  zoom: var(--preview-scale, 1);
}
```

And inside the existing `@media (min-width: 800px)` block, force full size on
desktop by adding:

```css
  [data-testid="resume-preview"] .resume-page {
    zoom: 1;
  }
```

- [ ] **Step 7: Run unit tests to verify no regressions**

Run: `npx vitest run`
Expected: all unit tests PASS (the `ResizeObserver`-guarded effect is a no-op under jsdom).

- [ ] **Step 8: Add an e2e test that the A4 fits the viewport width on mobile**

Add to `tests/e2e/editor.spec.ts`:

```ts
test("A4 preview fits the viewport width on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".cm-content").click();
  await page.getByRole("button", { name: "Load example" }).click();
  await page.getByRole("tab", { name: "Preview" }).click();
  const page4 = page.locator(".resume-page");
  await expect(page4).toBeVisible();
  const box = await page4.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(390);
});
```

- [ ] **Step 9: Run the e2e test to verify it passes**

Run: `npx playwright test tests/e2e/editor.spec.ts -g "A4 preview fits the viewport width on mobile"`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/resume-editor/ui/preview-scale.ts tests/unit/preview-scale.test.ts src/resume-editor/ui/ResumeWorkspace.tsx src/resume-editor/ui/editor.css tests/e2e/editor.spec.ts
git commit -m "feat: scale A4 preview to fit mobile width"
```

---

### Task 5: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: all tests PASS.

- [ ] **Step 2: Run the e2e suite**

Run: `npm run test:e2e`
Expected: all tests PASS.

- [ ] **Step 3: Run the production build**

Run: `npm run build`
Expected: build succeeds (`astro check` clean).

- [ ] **Step 4: Format check**

Run: `npm run format:check`
Expected: PASS. If it fails, run `npm run format`, then re-run this step, and commit any formatting changes:

```bash
git add -A
git commit -m "style: apply prettier formatting"
```
