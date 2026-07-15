import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { linter, type Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import type { ValidationDiagnostic } from "../domain/validation-result";
import { scrollViewToLine } from "./json-editor-navigation";

export type JsonEditorHandle = { scrollToLine(line: number): void };

type Props = {
  value: string;
  diagnostics: ValidationDiagnostic[];
  onChange(value: string): void;
};

const toCodeMirrorDiagnostic = (
  view: EditorView,
  diagnostic: ValidationDiagnostic,
): Diagnostic | null => {
  if (!diagnostic.line) return null;
  const lineNumber = Math.min(
    Math.max(diagnostic.line, 1),
    view.state.doc.lines,
  );
  const line = view.state.doc.line(lineNumber);
  const from = Math.min(
    line.from + Math.max((diagnostic.column ?? 1) - 1, 0),
    line.to,
  );
  return {
    from,
    to: Math.min(from + 1, view.state.doc.length),
    severity: "error",
    message: diagnostic.message,
  };
};

export const JsonEditor = forwardRef<JsonEditorHandle, Props>(
  function JsonEditor({ value, diagnostics, onChange }, ref) {
    const editorRef = useRef<ReactCodeMirrorRef>(null);
    useImperativeHandle(ref, () => ({
      scrollToLine(line: number) {
        const view = editorRef.current?.view;
        if (view) scrollViewToLine(view, line);
      },
    }));
    const extensions = useMemo(
      () => [
        json(),
        linter((view) =>
          diagnostics.flatMap(
            (item) => toCodeMirrorDiagnostic(view, item) ?? [],
          ),
        ),
      ],
      [diagnostics],
    );
    return (
      <CodeMirror
        ref={editorRef}
        aria-label="JSON editor"
        value={value}
        height="calc(100vh - 9rem)"
        theme="dark"
        extensions={extensions}
        basicSetup={{
          lineNumbers: true,
          bracketMatching: true,
          closeBrackets: true,
          foldGutter: true,
        }}
        onChange={onChange}
      />
    );
  },
);
