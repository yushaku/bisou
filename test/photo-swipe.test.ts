import { describe, expect, it } from "vitest";
import { swipedPhotoIndex } from "../src/client/lib/photoSwipe";

describe("photo swipe", () => {
  it("moves one photo in either direction past the threshold", () => {
    expect(swipedPhotoIndex(1, 4, -60, 10, 400)).toBe(2);
    expect(swipedPhotoIndex(1, 4, 60, -10, 400)).toBe(0);
  });

  it("ignores short, vertical and diagonal gestures", () => {
    expect(swipedPhotoIndex(1, 4, -59, 0, 400)).toBe(1);
    expect(swipedPhotoIndex(1, 4, -90, 120, 400)).toBe(1);
    expect(swipedPhotoIndex(1, 4, 90, -90, 400)).toBe(1);
    expect(swipedPhotoIndex(1, 4, 0, 0, 400)).toBe(1);
  });

  it("never wraps at either end or in a single-photo entry", () => {
    expect(swipedPhotoIndex(0, 4, 100, 0, 400)).toBe(0);
    expect(swipedPhotoIndex(3, 4, -100, 0, 400)).toBe(3);
    expect(swipedPhotoIndex(0, 1, -100, 0, 400)).toBe(0);
    expect(swipedPhotoIndex(0, 1, 100, 0, 400)).toBe(0);
  });

  it("uses the viewer width for its threshold", () => {
    expect(swipedPhotoIndex(0, 2, -50, 0, 320)).toBe(1);
    expect(swipedPhotoIndex(0, 2, -50, 0, 800)).toBe(0);
  });
});
