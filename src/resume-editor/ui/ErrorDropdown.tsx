import type { ValidationDiagnostic } from "../domain/validation-result";

type Props = {
  id: string;
  diagnostics: ValidationDiagnostic[];
  importError: string | null;
  persistenceFailed: boolean;
  onNavigate(line: number): void;
  onClose(): void;
};

export function ErrorDropdown({
  id,
  diagnostics,
  importError,
  persistenceFailed,
  onNavigate,
  onClose,
}: Props) {
  const count = diagnostics.length;
  return (
    <div
      id={id}
      role="dialog"
      aria-label="Problemas de validación"
      className="error-dropdown"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="error-dropdown-header">
        <span>{`${count} ${count === 1 ? "problema" : "problemas"}`}</span>
        <button type="button" aria-label="Cerrar" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="error-dropdown-body">
        {importError && <p className="error-notice">{importError}</p>}
        {persistenceFailed && (
          <p className="error-notice">
            Local saving failed. Export your JSON to avoid losing changes.
          </p>
        )}
        {diagnostics.map((item, index) => {
          const label = item.path === "/" ? "JSON" : item.path;
          const key = `${item.path}-${item.keyword}-${index}`;
          if (item.line) {
            const line = item.line;
            return (
              <button
                type="button"
                key={key}
                className="error-row error-row-navigable"
                onClick={() => onNavigate(line)}
              >
                <span className="error-row-label">{label}</span>
                <span className="error-row-message">{item.message}</span>
                <span className="error-row-line">{`L${line}`}</span>
              </button>
            );
          }
          return (
            <div className="error-row" key={key}>
              <span className="error-row-label">{label}</span>
              <span className="error-row-message">{item.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
