import type { Resume } from "../../resume/domain/generated/resume";
import type { TemplateId } from "../../resume-templates/domain/resume-template";
import type { DraftEvaluation } from "./draft-evaluation";
import type { ValidationDiagnostic } from "./validation-result";

export type EditorState = {
  rawText: string;
  status: DraftEvaluation["status"];
  currentResume: Resume | null;
  lastValidResume: Resume | null;
  diagnostics: ValidationDiagnostic[];
  selectedTemplate: TemplateId;
  previewStale: boolean;
  persistenceStatus: "idle" | "pending" | "saved" | "failed";
};

export type EditorEvent =
  | { type: "draftEvaluated"; rawText: string; evaluation: DraftEvaluation }
  | { type: "templateSelected"; template: TemplateId }
  | { type: "persistencePending" }
  | { type: "persistenceSaved" }
  | { type: "persistenceFailed" }
  | { type: "cleared" };

export const createEditorState = (
  rawText: string,
  template: TemplateId,
  evaluation: DraftEvaluation,
): EditorState => ({
  rawText,
  status: evaluation.status,
  currentResume: evaluation.status === "valid" ? evaluation.resume : null,
  lastValidResume: evaluation.status === "valid" ? evaluation.resume : null,
  diagnostics: evaluation.diagnostics,
  selectedTemplate: template,
  previewStale: false,
  persistenceStatus: "idle",
});

export const editorReducer = (
  state: EditorState,
  event: EditorEvent,
): EditorState => {
  if (event.type === "templateSelected")
    return {
      ...state,
      selectedTemplate: event.template,
      persistenceStatus: "pending",
    };
  if (event.type === "persistencePending")
    return { ...state, persistenceStatus: "pending" };
  if (event.type === "persistenceSaved")
    return { ...state, persistenceStatus: "saved" };
  if (event.type === "persistenceFailed")
    return { ...state, persistenceStatus: "failed" };
  if (event.type === "cleared")
    return createEditorState("", "editorial", {
      status: "empty",
      diagnostics: [],
    });

  const validResume =
    event.evaluation.status === "valid" ? event.evaluation.resume : null;
  return {
    ...state,
    rawText: event.rawText,
    status: event.evaluation.status,
    currentResume: validResume,
    lastValidResume: validResume ?? state.lastValidResume,
    diagnostics: event.evaluation.diagnostics,
    previewStale:
      event.evaluation.status !== "valid" && state.lastValidResume !== null,
    persistenceStatus: "pending",
  };
};
