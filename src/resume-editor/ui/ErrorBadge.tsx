import { formatBadgeCount } from "./error-widget-utils";

type Props = {
  count: number;
  open: boolean;
  controls: string;
  onToggle(): void;
};

export function ErrorBadge({ count, open, controls, onToggle }: Props) {
  const label =
    count > 0 ? `Ver ${formatBadgeCount(count)} problemas` : "Ver avisos";
  return (
    <button
      type="button"
      className="error-badge"
      aria-haspopup="dialog"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={label}
      onClick={onToggle}
    >
      <span aria-hidden="true">⚠</span>
      {count > 0 && (
        <span className="error-badge-count">{formatBadgeCount(count)}</span>
      )}
    </button>
  );
}
