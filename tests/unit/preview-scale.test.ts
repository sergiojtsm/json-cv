import { describe, expect, it } from "vitest";
import {
  A4_WIDTH_PX,
  computePreviewScale,
} from "../../src/resume-editor/ui/preview-scale";

describe("computePreviewScale", () => {
  it("scales down when the container is narrower than the page", () => {
    expect(computePreviewScale(400)).toBeCloseTo(400 / A4_WIDTH_PX, 5);
  });

  it("never scales above 1 when the container is wide", () => {
    expect(computePreviewScale(2000)).toBe(1);
  });

  it("returns 1 for non-positive or non-finite widths", () => {
    expect(computePreviewScale(0)).toBe(1);
    expect(computePreviewScale(-50)).toBe(1);
    expect(computePreviewScale(Number.NaN)).toBe(1);
  });

  it("honours a custom page width", () => {
    expect(computePreviewScale(300, 600)).toBeCloseTo(0.5, 5);
  });
});
