import { useDeferredValue, useState } from "react";
import { templateRegistry } from "../../resume-templates/template-registry";
import {
  useResumeEditor,
  type ResumeEditorDependencies,
} from "../application/use-resume-editor";
import { BrowserPrintGateway } from "../adapters/browser/browser-print-gateway";
import { BrowserResumeFileGateway } from "../adapters/browser/browser-resume-file-gateway";
import { LocalStorageDraftRepository } from "../adapters/persistence/local-storage-draft-repository";
import { AjvResumeValidator } from "../adapters/validation/ajv-resume-validator";
import { JsonEditor } from "./JsonEditor";
import { TemplateSelector } from "./TemplateSelector";
import { ValidationPanel } from "./ValidationPanel";

type Props = { dependencies?: ResumeEditorDependencies };

export function ResumeWorkspace({ dependencies }: Props) {
  const [defaults] = useState<ResumeEditorDependencies>(() => ({
    validator: new AjvResumeValidator(),
    draftRepository: new LocalStorageDraftRepository(window.localStorage),
    fileGateway: new BrowserResumeFileGateway(document, URL),
    printGateway: new BrowserPrintGateway(window),
  }));
  const editor = useResumeEditor(dependencies ?? defaults);
  const previewResume = useDeferredValue(editor.state.lastValidResume);
  const [mobileTab, setMobileTab] = useState<"editor" | "preview">("editor");
  const Template = templateRegistry[editor.state.selectedTemplate];
  const outputDisabled =
    editor.state.status !== "valid" || !editor.state.currentResume;

  const clear = () => {
    if (window.confirm("Clear the locally saved resume from this browser?"))
      editor.clear();
  };

  return (
    <main className="editor-app">
      <header className="editor-toolbar">
        <strong>JSON CV</strong>
        <span role="status">
          {editor.state.persistenceStatus === "failed"
            ? "Local save failed"
            : editor.state.persistenceStatus === "pending"
              ? "Saving locally…"
              : editor.state.persistenceStatus === "saved"
                ? "Saved locally"
                : "Local only"}
        </span>
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
            onClick={editor.print}
          >
            Save as PDF
          </button>
          <button type="button" onClick={clear}>
            Clear local data
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
          <JsonEditor
            value={editor.state.rawText}
            diagnostics={editor.state.diagnostics}
            onChange={editor.changeDraft}
          />
          <ValidationPanel
            diagnostics={editor.state.diagnostics}
            importError={editor.importError}
            persistenceFailed={editor.state.persistenceStatus === "failed"}
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
          <div data-testid="resume-preview">
            {previewResume ? (
              <Template resume={previewResume} />
            ) : (
              <p>Import or enter a JSON Resume to begin.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

export default ResumeWorkspace;
