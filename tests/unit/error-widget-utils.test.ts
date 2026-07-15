import { describe, expect, it } from "vitest";
import {
  describeErrorSummary,
  formatBadgeCount,
} from "../../src/resume-editor/ui/error-widget-utils";

describe("formatBadgeCount", () => {
  it("shows the raw count up to 99", () => {
    expect(formatBadgeCount(0)).toBe("0");
    expect(formatBadgeCount(99)).toBe("99");
  });

  it("caps counts above 99", () => {
    expect(formatBadgeCount(100)).toBe("99+");
    expect(formatBadgeCount(2500)).toBe("99+");
  });
});

describe("describeErrorSummary", () => {
  it("describes validation error counts", () => {
    expect(describeErrorSummary({ count: 1, hasNotices: false })).toBe(
      "1 error de validación",
    );
    expect(describeErrorSummary({ count: 3, hasNotices: false })).toBe(
      "3 errores de validación",
    );
  });

  it("falls back to notices then the empty state", () => {
    expect(describeErrorSummary({ count: 0, hasNotices: true })).toBe(
      "Avisos pendientes",
    );
    expect(describeErrorSummary({ count: 0, hasNotices: false })).toBe(
      "Sin errores",
    );
  });
});
