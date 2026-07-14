# Native Print Whitespace Fix Report

## Status

- Automated verification: PASS
- Native Chrome quality status: PENDING for the current head
- Native verification must be rerun because print output changed.

## Root Cause

The unconditional `.resume-entry { break-inside: avoid; }` rule caused the first long Experience article (45 highlights, approximately 942.7px high) to move to page 2. The article fit on a fresh page but not in the remaining page 1 space after the header and Profile, leaving avoidable whitespace and producing six pages.

Runtime isolation confirmed that setting `break-inside: auto` reduced all three long templates from six pages to five and allowed Company 01 to begin on page 1. The `h3 { break-after: avoid; }` rule continues to preserve heading cohesion. The `h2` rule and editorial border were excluded as causes.

## RED Evidence

The long PDF test was strengthened before the production change to require exactly five pages, Company 01 on page 1, and continuation of the oversized first entry onto page 2 without content loss.

Command:

```text
npm run test:pdf -- --grep "long resume"
```

Pre-fix result at `74ec635` with the test-only change:

```text
editorial/long: 6 page(s) - failed
minimal/long: 6 page(s) - failed
professional/long: 6 page(s) - failed
3 failed
Expected length: 5
Received length: 6
```

The extracted page text confirmed Company 01 was absent from page 1 and started on page 2 in every theme.

The initial result-34 page boundary was not stable across theme typography after the fix: minimal placed result 34 at the end of page 1 while editorial and professional placed it on page 2. The corrected cross-theme contract checks result 45 on page 2, proving that the oversized first entry continues across the page boundary without requiring identical line breaks across themes. Existing whole-document assertions continue to verify all 14 companies and result 45 globally.

## Production Fix

Removed only the unconditional `break-inside: avoid` declaration from `.resume-entry`. Entry spacing and heading cohesion remain unchanged; no heuristics were added.

## GREEN Evidence

Focused long PDF tests:

```text
npm run test:pdf -- --grep "long resume"
editorial/long: 5 page(s)
minimal/long: 5 page(s)
professional/long: 5 page(s)
3 passed
```

Full verification:

```text
npm run test:pdf
9 passed; short 1 page, complete 2 pages, long 5 pages for each template

npm test
4 test files passed; 87 tests passed

npm run build
Astro check: 0 errors, 0 warnings, 0 hints; 10 static pages built

npm run check:generated-types
passed with no generated type diff

npm run format:check
all files matched Prettier formatting
```

Final diff and port-clear checks are recorded in the commit verification performed after this report was written.
