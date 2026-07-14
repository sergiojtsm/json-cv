import { describe, expect, it } from "vitest";
import {
  createEditorState,
  editorReducer,
} from "../../src/resume-editor/domain/editor-state";
import { completeResume, shortResume } from "../../src/resume-fixtures/resumes";
import type { DraftEvaluation } from "../../src/resume-editor/domain/draft-evaluation";

describe("editorReducer", () => {
  const valid: DraftEvaluation = {
    status: "valid",
    diagnostics: [],
    resume: shortResume,
  };
  const empty: DraftEvaluation = { status: "empty", diagnostics: [] };
  const invalid: DraftEvaluation = {
    status: "invalid",
    reason: "syntax",
    diagnostics: [{ path: "/", keyword: "syntax", message: "bad" }],
  };

  it("initializes from a valid draft", () => {
    expect(createEditorState("{}", "editorial", valid)).toEqual({
      rawText: "{}",
      status: "valid",
      currentResume: shortResume,
      lastValidResume: shortResume,
      diagnostics: [],
      selectedTemplate: "editorial",
      previewStale: false,
      persistenceStatus: "idle",
    });
  });

  it("initializes an invalid draft without a stale preview", () => {
    expect(createEditorState("{", "minimal", invalid)).toEqual({
      rawText: "{",
      status: "invalid",
      currentResume: null,
      lastValidResume: null,
      diagnostics: invalid.diagnostics,
      selectedTemplate: "minimal",
      previewStale: false,
      persistenceStatus: "idle",
    });
  });

  it("keeps the last valid preview during invalid and empty edits", () => {
    const state = createEditorState("{}", "editorial", valid);
    const invalidState = editorReducer(state, {
      type: "draftEvaluated",
      rawText: "{",
      evaluation: invalid,
    });
    const emptyState = editorReducer(invalidState, {
      type: "draftEvaluated",
      rawText: "",
      evaluation: empty,
    });

    expect(invalidState).toEqual(
      expect.objectContaining({
        rawText: "{",
        status: "invalid",
        currentResume: null,
        lastValidResume: shortResume,
        diagnostics: invalid.diagnostics,
        previewStale: true,
        persistenceStatus: "pending",
      }),
    );
    expect(emptyState).toEqual(
      expect.objectContaining({
        rawText: "",
        status: "empty",
        currentResume: null,
        lastValidResume: shortResume,
        diagnostics: [],
        previewStale: true,
        persistenceStatus: "pending",
      }),
    );
  });

  it("replaces the stale preview when the draft becomes valid again", () => {
    const state = editorReducer(createEditorState("{}", "editorial", valid), {
      type: "draftEvaluated",
      rawText: "{",
      evaluation: invalid,
    });

    expect(
      editorReducer(state, {
        type: "draftEvaluated",
        rawText: '{"basics":{}}',
        evaluation: {
          status: "valid",
          diagnostics: [],
          resume: completeResume,
        },
      }),
    ).toEqual(
      expect.objectContaining({
        currentResume: completeResume,
        lastValidResume: completeResume,
        previewStale: false,
      }),
    );
  });

  it("changes template without changing or mutating draft data", () => {
    const state = createEditorState("{}", "editorial", valid);
    const next = editorReducer(state, {
      type: "templateSelected",
      template: "minimal",
    });

    expect(next).toEqual(
      expect.objectContaining({
        rawText: "{}",
        selectedTemplate: "minimal",
        currentResume: shortResume,
        lastValidResume: shortResume,
        persistenceStatus: "pending",
      }),
    );
    expect(next).not.toBe(state);
    expect(next.currentResume).toBe(state.currentResume);
    expect(state.selectedTemplate).toBe("editorial");
    expect(shortResume.basics?.name).toBe("Alex Morgan");
  });

  it.each([
    ["persistencePending", "pending"],
    ["persistenceSaved", "saved"],
    ["persistenceFailed", "failed"],
  ] as const)("maps %s to the %s persistence status", (type, expected) => {
    const state = createEditorState("{}", "editorial", valid);

    const next = editorReducer(state, { type });

    expect(next.persistenceStatus).toBe(expected);
    expect(next).not.toBe(state);
    expect(state.persistenceStatus).toBe("idle");
  });

  it("clears all local state and restores the default template", () => {
    const state = editorReducer(createEditorState("{}", "minimal", valid), {
      type: "persistenceFailed",
    });

    expect(editorReducer(state, { type: "cleared" })).toEqual({
      rawText: "",
      status: "empty",
      currentResume: null,
      lastValidResume: null,
      diagnostics: [],
      selectedTemplate: "editorial",
      previewStale: false,
      persistenceStatus: "idle",
    });
  });
});
