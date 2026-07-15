# Session State — 2026-07-15 JSON CV Editor

## Completed

1. Print fix: ventana nueva con HTML plano (commit d24ea65 + afa5010)
2. Root redirect a /editor/ (commit 338ee3b)
3. Load example button (commit 5a78b0d)
4. Empty-state placeholder (commit a7a855c)
5. Sticky toolbar + scroll independiente (commit d54e331 + fc6bddc)
6. Intercept Cmd+P / Ctrl+P (commit afa5010)
7. Architecture doc escrito (docs/ARCHITECTURE.md)

## Pending for GitHub Pages Deployment

1. `astro.config.mjs` — añadir `site: "https://sergiojtsm.github.io"`, `base: "/json-cv/"`
2. `src/pages/index.astro` — cambiar redirect a `import.meta.env.BASE_URL + "editor/"`
3. `src/pages/feasibility/[template]/[fixture].astro` — cambiar `<a href="/">` a `import.meta.env.BASE_URL`
4. `playwright.config.ts` — actualizar baseURL a `http://127.0.0.1:4321/json-cv/`
5. `.github/workflows/deploy.yml` — GitHub Action para deploy
6. `README.md` — documentación del proyecto
7. `LICENSE` — MIT
8. `public/favicon.svg` — favicon
9. `package.json` — quitar `"private": true`
10. `public/404.html` — página 404 personalizada
11. Limpiar feasibility routes (ocultarlas o eliminarlas)
12. Actualizar docs con paths correctos

## Edge Cases Identified

- Popup blocker en print (window.open bloqueado)
- Safari/Private: localStorage puede fallar
- Error boundary si React crashea
- Open Graph / SEO metas
