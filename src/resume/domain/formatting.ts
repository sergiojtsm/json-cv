import type { Resume } from "./generated/resume";

type Location = NonNullable<NonNullable<Resume["basics"]>["location"]>;

export const formatDateRange = (
  startDate?: string,
  endDate?: string,
): string => {
  if (!startDate && !endDate) return "";
  if (!startDate) return endDate ?? "";
  return `${startDate} – ${endDate || "Present"}`;
};

export const formatLocation = (location?: Location): string =>
  [location?.city, location?.region, location?.countryCode]
    .filter(Boolean)
    .join(", ");
