import { useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { linter, type Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import type { ValidationDiagnostic } from "../domain/validation-result";

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

export function JsonEditor({ value, diagnostics, onChange }: Props) {
  const extensions = useMemo(
    () => [
      json(),
      linter((view) =>
        diagnostics.flatMap((item) => toCodeMirrorDiagnostic(view, item) ?? []),
      ),
    ],
    [diagnostics],
  );
  return (
    <CodeMirror
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
}
