export const formatBadgeCount = (count: number): string =>
  count > 99 ? "99+" : String(count);

export const describeErrorSummary = ({
  count,
  hasNotices,
}: {
  count: number;
  hasNotices: boolean;
}): string => {
  if (count === 1) return "1 error de validación";
  if (count > 1) return `${count} errores de validación`;
  if (hasNotices) return "Avisos pendientes";
  return "Sin errores";
};
