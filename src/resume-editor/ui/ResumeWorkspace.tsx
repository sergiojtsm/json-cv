import { useEffect, useDeferredValue, useRef, useState } from "react";
import { templateRegistry } from "../../resume-templates/template-registry";
import {
  useResumeEditor,
  type ResumeEditorDependencies,
} from "../application/use-resume-editor";
import { BrowserPrintGateway } from "../adapters/browser/browser-print-gateway";
import { completeResume } from "../../resume-fixtures/resumes";
import { BrowserResumeFileGateway } from "../adapters/browser/browser-resume-file-gateway";
import { LocalStorageDraftRepository } from "../adapters/persistence/local-storage-draft-repository";
import { AjvResumeValidator } from "../adapters/validation/ajv-resume-validator";
import { JsonEditor, type JsonEditorHandle } from "./JsonEditor";
import { TemplateSelector } from "./TemplateSelector";
import { ErrorBoundary } from "./ErrorBoundary";
import { ErrorWidget } from "./ErrorWidget";
import { computePreviewScale } from "./preview-scale";

type Props = { dependencies?: ResumeEditorDependencies };

export function ResumeWorkspace({ dependencies }: Props) {
  const [defaults] = useState<ResumeEditorDependencies>(() => ({
    validator: new AjvResumeValidator(),
    draftRepository: new LocalStorageDraftRepository(window.localStorage),
    fileGateway: new BrowserResumeFileGateway(document, URL),
    printGateway: new BrowserPrintGateway(window, window),
  }));
  const editor = useResumeEditor(dependencies ?? defaults);
  const previewResume = useDeferredValue(editor.state.lastValidResume);
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");
  const Template = templateRegistry[editor.state.selectedTemplate];
  const jsonEditorRef = useRef<JsonEditorHandle>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const outputDisabled =
    editor.state.status !== "valid" || !editor.state.currentResume;

  const printResume = () => {
    const previewEl = document.querySelector(
      '[data-testid="resume-preview"] .resume-page',
    );
    if (!previewEl) {
      editor.print();
      return;
    }
    const styleTags = document.querySelectorAll("style, link[rel=stylesheet]");
    const styles = Array.from(styleTags)
      .map((el) => el.outerHTML)
      .join("\n");
    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Resume</title>
${styles}
<style>html,body{margin:0;padding:0;background:white}</style>
</head>
<body>
${(previewEl as HTMLElement).outerHTML}
</body>
</html>`;
    editor.print(html);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "p") {
        event.preventDefault();
        if (!outputDisabled) printResume();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [outputDisabled]);

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

  const clear = () => {
    if (window.confirm("Clear the locally saved resume from this browser?"))
      editor.clear();
  };

  const loadExample = () => {
    if (
      editor.state.rawText &&
      !window.confirm("Replace current content with the example?")
    )
      return;
    editor.changeDraft(JSON.stringify(completeResume, null, 2));
  };

  return (
    <ErrorBoundary>
      <main className="editor-app">
        <header className="editor-toolbar">
          <strong>JSON CV</strong>
          <span role="status">
            {editor.printError
              ? editor.printError
              : editor.state.persistenceStatus === "failed"
                ? "Local save failed"
                : editor.state.persistenceStatus === "pending"
                  ? "Saving locally…"
                  : editor.state.persistenceStatus === "saved"
                    ? "Saved locally"
                    : "Local only"}
          </span>
          <ErrorWidget
            diagnostics={editor.state.diagnostics}
            importError={editor.importError}
            persistenceFailed={editor.state.persistenceStatus === "failed"}
            onNavigate={(line) => jsonEditorRef.current?.scrollToLine(line)}
          />
          <div className="editor-actions">
            <label className="file-action">
              Import JSON
              <input
                aria-label="Import JSON file"
                hidden
                type="file"
                accept="application/json,.json"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void editor.importFile(file);
                }}
              />
            </label>
            <button
              type="button"
              disabled={outputDisabled}
              onClick={editor.exportJson}
            >
              Export JSON
            </button>
            <button
              type="button"
              disabled={outputDisabled}
              onClick={printResume}
            >
              Save as PDF
            </button>
            <button type="button" onClick={clear}>
              Clear local data
            </button>
            <button type="button" onClick={loadExample}>
              Load example
            </button>
          </div>
        </header>
        <TemplateSelector
          value={editor.state.selectedTemplate}
          onChange={editor.selectTemplate}
        />
        <div className="mobile-tabs" role="tablist" aria-label="Workspace view">
          <button
            role="tab"
            aria-selected={mobileTab === "editor"}
            onClick={() => setMobileTab("editor")}
          >
            Editor
          </button>
          <button
            role="tab"
            aria-selected={mobileTab === "preview"}
            onClick={() => setMobileTab("preview")}
          >
            Preview
          </button>
        </div>
        <div className="editor-workspace">
          <section
            className="editor-pane"
            data-mobile-hidden={mobileTab !== "editor"}
          >
            {editor.state.status === "empty" && (
              <div className="editor-placeholder">
                <p>
                  Paste your JSON Resume or import a file. The format follows
                  the{" "}
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
            )}
            <JsonEditor
              ref={jsonEditorRef}
              value={editor.state.rawText}
              diagnostics={editor.state.diagnostics}
              onChange={editor.changeDraft}
            />
          </section>
          <section
            className="preview-pane"
            data-mobile-hidden={mobileTab !== "preview"}
          >
            {editor.state.previewStale && (
              <p className="stale-preview">
                Preview shows the last valid version.
              </p>
            )}
            <div data-testid="resume-preview" ref={previewRef}>
              {previewResume ? (
                <Template resume={previewResume} />
              ) : (
                <p>Import or enter a JSON Resume to begin.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </ErrorBoundary>
  );
}

export default ResumeWorkspace;
