# PDF Feasibility Result

**Status:** AUTOMATED PASS; NATIVE VERIFICATION PENDING FOR CURRENT HEAD
**Scope:** Desktop Chrome/Chromium, A4, JSON Resume Schema 1.3.0

## Test Environment

- Date: 2026-07-14
- OS: macOS 26.5.2 (25F84)
- Native browser: Google Chrome 150.0.7871.115
- Automation: Playwright 1.61.1 with its Desktop Chrome project
- Runtime: Node.js 24.15.0, npm 11.12.1
- Source under test: Astro production build served from the generated static `dist` artifact
- PDF settings: A4, CSS page size preferred, backgrounds enabled, tagged PDF enabled

## Automated Evidence

- All unit and semantic rendering tests pass.
- All nine Playwright Chromium PDF tests pass.
- Short fixtures produce one page with selectable text.
- Complete fixtures preserve every human-facing standard section, reading order, and links.
- Long fixtures produce at least three non-empty pages without missing work entries.
- Static Astro type-check and production build pass.

### Automated Page Counts

| Template     | Short | Complete | Long |
| ------------ | ----: | -------: | ---: |
| Editorial    |     1 |        2 |    6 |
| Minimal      |     1 |        2 |    6 |
| Professional |     1 |        2 |    6 |

## Native Print Evidence

The renderer output changed after the previously confirmed native run. Native Chrome Save as PDF verification must be rerun for the current head before restoring a native PASS decision.

| Template     | Complete | Long    |
| ------------ | -------- | ------- |
| Editorial    | PENDING  | PENDING |
| Minimal      | PENDING  | PENDING |
| Professional | PENDING  | PENDING |

## Decision

The automated browser-only HTML/CSS print architecture checks pass. The native feasibility gate for the current head remains pending until all six complete/long template checks are rerun in desktop Chrome with A4 output.
