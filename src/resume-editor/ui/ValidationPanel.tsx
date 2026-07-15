import type { ValidationDiagnostic } from "../domain/validation-result";

type Props = {
  diagnostics: ValidationDiagnostic[];
  importError: string | null;
  persistenceFailed: boolean;
};
export function ValidationPanel({
  diagnostics,
  importError,
  persistenceFailed,
}: Props) {
  if (!diagnostics.length && !importError && !persistenceFailed) return null;
  return (
    <div className="validation-panel" role="alert">
      {importError && <p>{importError}</p>}
      {persistenceFailed && (
        <p>Local saving failed. Export your JSON to avoid losing changes.</p>
      )}
      {diagnostics.map((item, index) => (
        <p key={`${item.path}-${item.keyword}-${index}`}>
          <strong>{item.path === "/" ? "JSON" : item.path}</strong>:{" "}
          {item.message}
          {item.line ? ` (line ${item.line}, column ${item.column ?? 1})` : ""}
        </p>
      ))}
    </div>
  );
}
