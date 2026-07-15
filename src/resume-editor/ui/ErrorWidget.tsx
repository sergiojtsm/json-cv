import { useEffect, useId, useRef, useState } from "react";
import type { ValidationDiagnostic } from "../domain/validation-result";
import { ErrorBadge } from "./ErrorBadge";
import { ErrorDropdown } from "./ErrorDropdown";
import { describeErrorSummary } from "./error-widget-utils";

type Props = {
  diagnostics: ValidationDiagnostic[];
  importError: string | null;
  persistenceFailed: boolean;
  onNavigate(line: number): void;
};

export function ErrorWidget({
  diagnostics,
  importError,
  persistenceFailed,
  onNavigate,
}: Props) {
  const [open, setOpen] = useState(false);
  const dropdownId = useId();
  const containerRef = useRef<HTMLDivElement>(null);

  const count = diagnostics.length;
  const hasNotices = importError !== null || persistenceFailed;
  const visible = count > 0 || hasNotices;

  useEffect(() => {
    if (!visible) setOpen(false);
  }, [visible]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const navigate = (line: number) => {
    onNavigate(line);
    setOpen(false);
  };

  return (
    <div className="error-widget" ref={containerRef}>
      <span className="visually-hidden" role="status" aria-live="polite">
        {describeErrorSummary({ count, hasNotices })}
      </span>
      {visible && (
        <ErrorBadge
          count={count}
          open={open}
          controls={dropdownId}
          onToggle={() => setOpen((value) => !value)}
        />
      )}
      {visible && open && (
        <ErrorDropdown
          id={dropdownId}
          diagnostics={diagnostics}
          importError={importError}
          persistenceFailed={persistenceFailed}
          onNavigate={navigate}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
