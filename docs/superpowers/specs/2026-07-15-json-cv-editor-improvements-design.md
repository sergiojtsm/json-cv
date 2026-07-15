# JSON CV Editor — Design Improvements

## 1. Routes & Print Fix

### Routes

- `index.astro` → HTTP 301 redirect to `/editor/`
- Keep `feasibility/` directory until print is verified working on the editor page

### Print Fix

**Root cause:** `<astro-island>` (Astro's wrapper for `client:only="react"`) has `display: contents` by default. The browser's PDF/print engine drops children promoted by `display: contents` when generating the actual print output, resulting in blank pages.

**Fix:** Add to `@media print` in `editor.css`:

```css
astro-island {
  display: block;
}
```

## 2. JSON Example & Placeholder

### Load Example Button

- Button in toolbar labelled "Load example"
- Reads `completeResume` from `resume-fixtures/resumes.ts`
- On click: if editor has content, prompt confirmation; then replaces editor content with the example JSON stringified
- The example loads the JSON text into the CodeMirror editor, triggering validation and preview

### Empty-state Placeholder

- When `editor.state.status === "empty"`, show a placeholder inside the editor pane
- Text: "Paste your JSON Resume or import a file. The format follows the [jsonresume.org](https://jsonresume.org/schema/) schema."
- Implemented as a div positioned over the empty CodeMirror area

## 3. Sticky Header + Scroll Layout

### Layout

```
┌──────────────────────────────────────────┐
│  TOOLBAR (sticky, always visible)         │
│  [JSON CV] [status] [Load example] ...    │
├──────────────────────────────────────────┤
│  Template selector (below toolbar)        │
├──────────────────────┬───────────────────┤
│  EDITOR PANE         │  PREVIEW PANE      │
│  (overflow-y: auto)  │  (overflow-y: auto)│
│  ┌──────────────┐    │  ┌─────────────┐   │
│  │ CodeMirror   │    │  │ Resume       │   │
│  │ JSON editor  │    │  │ Preview      │   │
│  └──────────────┘    │  └─────────────┘   │
│  ValidationPanel     │                    │
├──────────────────────┴───────────────────┤
```

### CSS Changes

- `.editor-toolbar` → `position: sticky; top: 0; z-index: 10;`
- `.template-selector` stays below toolbar (not sticky)
- `.editor-workspace` → `height: calc(100vh - <toolbar-height>); overflow: hidden;`
- `.editor-pane` → `overflow-y: auto; height: 100%;`
- `.preview-pane` → `overflow-y: auto; height: 100%;`

Each panel scrolls independently, filling the remaining viewport height.

## Files to modify

1. `src/pages/index.astro` — redirect to /editor/
2. `src/pages/editor.astro` — no changes needed
3. `src/resume-editor/ui/editor.css` — print fix + sticky header + scroll layout
4. `src/resume-editor/ui/ResumeWorkspace.tsx` — add Load example button, empty placeholder
5. `src/resume-editor/ui/JsonEditor.tsx` — add placeholder support
