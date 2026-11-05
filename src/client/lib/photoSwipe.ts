export function swipedPhotoIndex(index: number, total: number, dx: number, dy: number, width: number): number {
  if (Math.abs(dx) < width * 0.15 || Math.abs(dx) <= Math.abs(dy)) return index;
  return Math.max(0, Math.min(total - 1, index + (dx < 0 ? 1 : -1)));
}
