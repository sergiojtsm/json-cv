import { useEffect, useReducer, useState } from "react";
import { evaluateResumeDraft } from "./evaluate-resume-draft";
import type { DraftRepository } from "./ports/draft-repository";
import type { PrintGateway } from "./ports/print-gateway";
import type { ResumeFileGateway } from "./ports/resume-file-gateway";
import type { ResumeValidator } from "./ports/resume-validator";
import { createEditorState, editorReducer } from "../domain/editor-state";
import type { TemplateId } from "../../resume-templates/domain/resume-template";

export type ResumeEditorDependencies = {
  validator: ResumeValidator;
  draftRepository: DraftRepository;
  fileGateway: ResumeFileGateway;
  printGateway: PrintGateway;
};

export const useResumeEditor = (dependencies: ResumeEditorDependencies) => {
  const [restored] = useState(() => {
    try {
      return { draft: dependencies.draftRepository.load(), failed: false };
    } catch {
      return { draft: null, failed: true };
    }
  });
  const [state, dispatch] = useReducer(editorReducer, undefined, () => {
    const rawText = restored.draft?.rawText ?? "";
    const template = restored.draft?.selectedTemplate ?? "editorial";
    return createEditorState(
      rawText,
      template,
      evaluateResumeDraft(rawText, dependencies.validator),
    );
  });
  const [importError, setImportError] = useState<string | null>(null);

  useEffect(() => {
    if (restored.failed) dispatch({ type: "persistenceFailed" });
  }, [restored.failed]);

  useEffect(() => {
    if (state.status === "empty" && !state.rawText) return undefined;
    const timeout = window.setTimeout(() => {
      try {
        dependencies.draftRepository.save({
          version: 1,
          rawText: state.rawText,
          selectedTemplate: state.selectedTemplate,
        });
        dispatch({ type: "persistenceSaved" });
      } catch {
        dispatch({ type: "persistenceFailed" });
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [
    dependencies.draftRepository,
    state.rawText,
    state.selectedTemplate,
  ]);

  const changeDraft = (rawText: string) => {
    dispatch({
      type: "draftEvaluated",
      rawText,
      evaluation: evaluateResumeDraft(rawText, dependencies.validator),
    });
  };
  const selectTemplate = (template: TemplateId) =>
    dispatch({ type: "templateSelected", template });
  const importFile = async (file: File) => {
    try {
      setImportError(null);
      changeDraft(await dependencies.fileGateway.read(file));
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Unable to import this file.",
      );
    }
  };
  const exportJson = () => {
    if (state.status === "valid" && state.currentResume)
      dependencies.fileGateway.download(state.currentResume);
  };
  const print = () => {
    if (state.status === "valid" && state.currentResume)
      dependencies.printGateway.print();
  };
  const clear = () => {
    try {
      dependencies.draftRepository.clear();
      dispatch({ type: "cleared" });
      setImportError(null);
    } catch {
      dispatch({ type: "persistenceFailed" });
    }
  };

  return {
    state,
    importError,
    changeDraft,
    selectTemplate,
    importFile,
    exportJson,
    print,
    clear,
  };
};
