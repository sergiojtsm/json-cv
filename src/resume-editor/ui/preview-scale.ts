// 210mm (A4 width) at 96dpi = 210 * 96 / 25.4 ≈ 793.7px
export const A4_WIDTH_PX = 793.7;

export function computePreviewScale(
  containerWidth: number,
  pageWidth: number = A4_WIDTH_PX,
): number {
  if (!Number.isFinite(containerWidth) || containerWidth <= 0) return 1;
  return Math.min(1, containerWidth / pageWidth);
}
