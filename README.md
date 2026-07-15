# JSON CV

A browser-based JSON Resume editor with live preview, schema validation, and multiple templates. Built with Astro and React.

## Features

- **JSON editor** powered by CodeMirror 6 with syntax highlighting and linting
- **Live preview** renders your resume as you type
- **Schema validation** against the official [jsonresume.org](https://jsonresume.org/schema/) schema
- **3 templates**: Editorial, Minimal, and Professional
- **Persistent drafts** saved to localStorage
- **Import/export** JSON files
- **Print** to PDF with browser's native print dialog (Ctrl/Cmd+P)
- **Dark theme** editor

## Stack

| Layer      | Technology                                                                                                  |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| Framework  | [Astro 7](https://astro.build) (static output)                                                              |
| UI         | [React 19](https://react.dev)                                                                               |
| Editor     | [CodeMirror 6](https://codemirror.net) / [@uiw/react-codemirror](https://uiwjs.github.io/react-codemirror/) |
| Validation | [AJV](https://ajv.js.org) + [jsonresume-schema](https://www.npmjs.com/package/@jsonresume/schema)           |
| Tests      | [Vitest](https://vitest.dev) (unit) + [Playwright](https://playwright.dev) (e2e/PDF)                        |
| Format     | [Prettier](https://prettier.io)                                                                             |

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:4321/json-cv/editor/](http://localhost:4321/json-cv/editor/).

## Scripts

| Command            | Description                |
| ------------------ | -------------------------- |
| `npm run dev`      | Start dev server           |
| `npm run build`    | Build for production       |
| `npm run preview`  | Preview production build   |
| `npm test`         | Run unit tests (Vitest)    |
| `npm run test:e2e` | Run e2e tests (Playwright) |
| `npm run test:pdf` | Run PDF extraction tests   |
| `npm run test:all` | Run all tests + build      |
| `npm run format`   | Format with Prettier       |

## Deploy

The site is deployed to GitHub Pages on every push to `main` via the included GitHub Action.

[**Live demo**](https://sergiojtsm.github.io/json-cv/)

## License

MIT
