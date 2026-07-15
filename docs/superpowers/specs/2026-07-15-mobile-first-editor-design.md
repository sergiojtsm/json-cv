# Mobile-first editor design

Date: 2026-07-15

## Problem

The resume editor is desktop-first and breaks on mobile:

1. **No scroll in the CV preview.** On mobile the CV preview cannot be
   scrolled. Root cause: `.editor-app` is `height: 100vh` with
   `body { overflow: hidden }`, and on mobile `.editor-workspace` switches to
   `display: block`. The stacked panes get no constrained height, so the
   `overflow-y: auto` on `.preview-pane` has nothing to scroll against — content
   is clipped by the `100vh`/`overflow: hidden` root.

2. **Header overlaps the menus.** The `.editor-toolbar` holds title + status +
   error widget + five action buttons in a `flex` with no `wrap` and
   `justify-content: space-between`. On a narrow screen they squeeze/overflow and
   the sticky header collides with the `TemplateSelector` / `mobile-tabs`.

3. **Desktop-first CSS.** All layout is written for desktop with
   `@media (max-width: 800px)` overrides — the opposite of mobile-first.

4. **Fixed A4 preview.** `.resume-page` is `width: 210mm` (~793px), wider than a
   phone, so it overflows horizontally.

5. **Incomplete viewport meta.** `editor.astro` sets
   `content="width=device-width"` with no `initial-scale=1`, so scaling is wrong
   on mobile.

## Decisions

- **Preview on mobile:** scale the A4 page to fit the viewport width
  (`transform: scale`), natural vertical scroll. Keeps fidelity with the PDF.
- **Toolbar on mobile:** wrap actions across multiple rows with compact buttons.
  No new component, no new JS/state.

## Approach — mobile-first cascade

Rewrite `editor.css` so base styles target mobile; add desktop layout under
`@media (min-width: 800px)`. Touch `template.css`, `global.css`, and one line in
`editor.astro`.

### 1. Viewport (`editor.astro`)

`content="width=device-width"` → `content="width=device-width, initial-scale=1"`.

### 2. Root layout / scroll fix

- Remove the global `overflow: hidden` on `html, body`.
- Base (mobile): `.editor-app` is `flex-direction: column`,
  `min-height: 100dvh`. The active pane (editor **or** preview per tab) fills the
  remaining space and owns `overflow-y: auto`, so it scrolls.
- Desktop (`min-width: 800px`): restore `height: 100dvh` + 2-column grid, each
  pane with its own scroll (current behaviour).

### 3. Header

- Base (mobile): `.editor-toolbar` gets `flex-wrap: wrap`; `.editor-actions`
  wraps too; compact button padding/font-size. Header grows in height but never
  overlaps or overflows.
- Stays `sticky`; with the content area owning its own scroll (no root
  `overflow: hidden` clipping), it no longer paints over the selector/tabs.

### 4. A4 preview scaling (mobile)

- Scale `.resume-page` to fit width with `transform: scale(...)`,
  `transform-origin: top center`. Attempt pure CSS first
  (`scale(min(1, (100vw - padding) / 210mm))`); if exactness fails, add a tiny
  width-measuring hook in `ResumeWorkspace` that sets a `--preview-scale` var.
- Fix current `.preview-surface`/`.preview-pane` `overflow-x: auto` so no
  horizontal scroll is needed once scaled.

### 5. No logic changes

CSS + one meta line only (plus the optional measuring hook if CSS-only scaling is
not exact). `mobile-tabs` and all React components are preserved. Print path is
untouched — it keeps rendering the real A4 page.

## Testing

- Existing unit + e2e tests must still pass (there are scroll and toolbar tests).
- Manual/Playwright check at mobile viewport (~375px): preview scrolls, header
  wraps without overlap, A4 fits width.

## Risk

Point 4 (pure-CSS A4 scaling mixing `mm` and `vw`) is the delicate part and may
need a small JS measurement fallback.
