# JSON CV — Architecture

## Stack

- **Astro 7** (static output) + **React 19** (editor UI)
- **CodeMirror 6** (JSON editor), **AJV** (schema validation)
- **jsonresume-schema 1.3** (data model)
- **Playwright** (e2e + PDF tests), **Vitest** (unit tests)

---

## src/ — Source Code

### src/pages/ — Rutas (Astro pages)

| Fichero                                  | Responsabilidad                                                                                                      |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `index.astro`                            | Redirige 301 a `BASE_URL + "editor/"`                                                                                |
| `editor.astro`                           | Página del editor. Importa CSS global, OG metas, y monta `<ResumeWorkspace client:only="react" />`                   |
| `feasibility/[template]/[fixture].astro` | Páginas de validación de PDF (server-rendered). Genera CV estático con cada template+fixture para tests de impresión |

### src/resume-editor/ — Editor (core)

**ui/** — Componentes React:

| Fichero                | Responsabilidad                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `ResumeWorkspace.tsx`  | Componente raíz del editor. Toolbar, grid editor+preview, botones (importar, exportar, PDF, Clear, Load example), placeholder vacío |
| `JsonEditor.tsx`       | Wrapper de CodeMirror 6 con theme oscuro, lint de JSON, extensiones                                                                 |
| `TemplateSelector.tsx` | Radio buttons para elegir template (editorial/minimal/professional)                                                                 |
| `ValidationPanel.tsx`  | Muestra errores de validación JSON debajo del editor                                                                                |
| `ErrorBoundary.tsx`    | React Error Boundary que captura errores de renderizado y muestra pantalla de fallback con botón de recarga                         |
| `editor.css`           | Todos los estilos del editor: layout sticky+scroll, responsive, print                                                               |

**application/** — Lógica de aplicación:

| Fichero                    | Responsabilidad                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------- |
| `use-resume-editor.ts`     | Hook principal del editor. Orchestra: carga/guarda borrador, evalúa JSON, importa/exporta archivos, print |
| `evaluate-resume-draft.ts` | Evalúa texto RAW: parsea JSON, valida contra esquema, devuelve diagnóstico                                |
| `parse-stored-draft.ts`    | Parsea borrador guardado en localStorage con validación de versión                                        |
| `ports/`                   | Interfaces (puertos) para persistencia, print, file gateway, validator                                    |

**domain/** — Modelo de dominio:

| Fichero                | Responsabilidad                                                                       |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `editor-state.ts`      | Estado del editor + reducer (events: draftEvaluated, templateSelected, cleared, etc.) |
| `draft-evaluation.ts`  | Tipos: `DraftEvaluation` (status, resume, diagnostics)                                |
| `validation-result.ts` | Tipo `ValidationDiagnostic` (line, column, message)                                   |

**adapters/** — Implementaciones de puertos:

| Fichero                                         | Responsabilidad                                         |
| ----------------------------------------------- | ------------------------------------------------------- |
| `browser/browser-print-gateway.ts`              | Llama a `window.print()`                                |
| `browser/browser-resume-file-gateway.ts`        | Lee fichero JSON del sistema de archivos, descarga blob |
| `persistence/local-storage-draft-repository.ts` | Guarda/carga borrador en localStorage                   |
| `validation/ajv-resume-validator.ts`            | Valida JSON contra jsonresume-schema usando AJV         |

### src/resume-templates/ — Plantillas CV

| Fichero                                 | Responsabilidad                                                                       |
| --------------------------------------- | ------------------------------------------------------------------------------------- |
| `template.css`                          | Estilos base del CV (A4, fuentes, colores) + `@page` para print + temas               |
| `template-registry.ts`                  | Mapa de TemplateId → componente React                                                 |
| `adapters/resume-template-component.ts` | Tipos `ResumeTemplateProps`, `ResumeTemplateComponent`                                |
| `domain/resume-template.ts`             | Constante `templateIds` y tipo `TemplateId`                                           |
| `shared/ResumeDocument.tsx`             | Componente React que renderiza el CV completo (basics, work, education, skills, etc.) |
| `editorial/EditorialTemplate.tsx`       | Template "Editorial" (borde azul, títulos en azul)                                    |
| `minimal/MinimalTemplate.tsx`           | Template "Minimal" (Arial, minimalista)                                               |
| `professional/ProfessionalTemplate.tsx` | Template "Professional" (Georgia/serif, elegante)                                     |

### src/resume/ — Modelo de datos

| Fichero                      | Responsabilidad                                             |
| ---------------------------- | ----------------------------------------------------------- |
| `domain/generated/resume.ts` | Tipos TypeScript generados desde jsonresume-schema          |
| `domain/formatting.ts`       | Utilidades de formateo: `formatDateRange`, `formatLocation` |

### src/resume-fixtures/

| Fichero      | Responsabilidad                                                                                         |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `resumes.ts` | Datos de ejemplo (`shortResume`, `completeResume`, `longResume`) usados en tests y botón "Load example" |

### src/shared/

| Fichero             | Responsabilidad                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `styles/global.css` | Estilos globales (reset, tipografía base, clases utilitarias `.feasibility-toolbar`, `.preview-surface`) |

### Otros src/

| Fichero    | Responsabilidad                   |
| ---------- | --------------------------------- |
| `env.d.ts` | Declaraciones de tipos para Astro |

---

## tests/ — Tests

### tests/unit/ — Tests unitarios (Vitest)

| Fichero                                  | Lo que testea                                           |
| ---------------------------------------- | ------------------------------------------------------- |
| `editor-state.test.ts`                   | Reducer del estado del editor                           |
| `draft-evaluation.test.ts`               | Evaluación de borradores JSON                           |
| `resume-validator.test.ts`               | Validación contra jsonresume-schema                     |
| `local-storage-draft-repository.test.ts` | Persistencia en localStorage                            |
| `browser-gateways.test.ts`               | Gateways de browser (file, print)                       |
| `use-resume-editor.test.tsx`             | Hook principal (integración)                            |
| `resume-workspace.test.tsx`              | Componente ResumeWorkspace (render, acciones)           |
| `resume-document.test.tsx`               | Renderizado del CV (79 tests, el más grande)            |
| `formatting.test.ts`                     | Utilidades de formateo de fechas/localización           |
| `template-registry-architecture.test.ts` | Verifica que todos los templates existen en el registry |

### tests/e2e/ — Tests end-to-end (Playwright)

| Fichero          | Lo que testea                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| `editor.spec.ts` | 7 tests: editar, validar, cambiar template, importar/exportar, borrar, Load example, placeholder, print media |

### tests/pdf/ — Tests de PDF (Playwright)

| Fichero                   | Responsabilidad                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `pdf-feasibility.spec.ts` | Genera PDF de cada fixture+template y verifica que el texto se extrae correctamente |
| `extract-pdf.ts`          | Utilidad para extraer texto de un PDF generado                                      |

---

## Configuración raíz

| Fichero                             | Responsabilidad                                                 |
| ----------------------------------- | --------------------------------------------------------------- |
| `astro.config.mjs`                  | Astro: output static, site, base (/json-cv/), integración React |
| `tsconfig.json`                     | TypeScript config                                               |
| `vitest.config.ts`                  | Vitest config (jsdom, alias)                                    |
| `playwright.config.ts`              | Playwright config (servidor, vistas)                            |
| `prettier.config.mjs`               | Prettier formatter                                              |
| `package.json`                      | Dependencias y scripts                                          |
| `scripts/generate-resume-types.mjs` | Genera tipos TypeScript desde jsonresume-schema                 |
