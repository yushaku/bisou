import { describe, expect, it } from "vitest";
import {
  defaultDay,
  maxDay,
  saveBlock,
  saveErrorKey,
  startable,
  takeRoom,
  textLength,
  uploadErrorKey,
} from "../src/client/lib/compose";
import { toDayString } from "../src/shared/days";

// Compose rules as pure functions: the sheet only renders what these decide.

const done = { state: "done" as const };
// 2026-11-07T09:00Z: 16:00 in Hanoi, and already 8 November in UTC+14 at 23:00.
const NOW = Date.UTC(2026, 10, 7, 9);

describe("compose day", () => {
  it("AC7 (R7, R8): the default day is the device's today, never past the earliest time zone", () => {
    expect(maxDay(NOW)).toBe("2026-11-07");
    expect(maxDay(Date.UTC(2026, 10, 7, 11))).toBe("2026-11-08");
    const later = Date.UTC(2026, 10, 7, 11);
    expect(defaultDay(later)).toBe(toDayString(new Date(later)));
    expect(defaultDay(later) <= maxDay(later)).toBe(true);
  });

  it("AC7 (R7, R8): 8 November and 31 December 1899 block saving, 7 November and 1 January 1900 do not", () => {
    const form = { text: "hi", photos: [] };
    expect(saveBlock({ ...form, date: "2026-11-08" }, NOW)).toBe("date");
    expect(saveBlock({ ...form, date: "1899-12-31" }, NOW)).toBe("date");
    expect(saveBlock({ ...form, date: "2026-02-30" }, NOW)).toBe("date");
    expect(saveBlock({ ...form, date: "2026-11-07" }, NOW)).toBeNull();
    expect(saveBlock({ ...form, date: "1900-01-01" }, NOW)).toBeNull();
  });
});

describe("compose save rules", () => {
  const day = "2026-11-06";

  it("AC2 (R3): no text and no photo, or only spaces, cannot be saved", () => {
    expect(saveBlock({ date: day, text: "", photos: [] }, NOW)).toBe("empty");
    expect(saveBlock({ date: day, text: "  \n ", photos: [] }, NOW)).toBe("empty");
  });

  it("AC3 (R3, R5): photos without text save once every photo is uploaded", () => {
    expect(saveBlock({ date: day, text: "", photos: [done, done, done, done] }, NOW)).toBeNull();
    expect(saveBlock({ date: day, text: "", photos: [done, { state: "uploading" }] }, NOW)).toBe("photos");
    expect(saveBlock({ date: day, text: "rain", photos: [{ state: "failed" }] }, NOW)).toBe("photos");
  });

  it("AC4 (R4): 2001 characters are refused, 2000 plus outer spaces save, emoji count once", () => {
    expect(textLength(`  ${"a".repeat(2000)}  `)).toBe(2000);
    expect(textLength("😀".repeat(2000))).toBe(2000);
    expect(saveBlock({ date: day, text: "a".repeat(2001), photos: [] }, NOW)).toBe("tooLong");
    expect(saveBlock({ date: day, text: ` ${"a".repeat(2000)} `, photos: [] }, NOW)).toBeNull();
    expect(saveBlock({ date: day, text: "😀".repeat(2000), photos: [] }, NOW)).toBeNull();
  });

  it("AC3 (R5): a pick takes what fits in four and refuses the rest", () => {
    expect(takeRoom(0, 4)).toEqual({ take: 4, refused: false });
    expect(takeRoom(3, 2)).toEqual({ take: 1, refused: true });
    expect(takeRoom(4, 1)).toEqual({ take: 0, refused: true });
  });
});

describe("upload queue", () => {
  it("keeps at most two uploads in flight, in the order picked", () => {
    const items = [
      { localId: "a", state: "done" as const },
      { localId: "b", state: "uploading" as const },
      { localId: "c", state: "queued" as const },
      { localId: "d", state: "queued" as const },
    ];
    expect(startable(items)).toEqual(["c"]);
    expect(startable(items.map((i) => (i.localId === "b" ? { ...i, state: "failed" as const } : i)))).toEqual(["c", "d"]);
    expect(startable([{ localId: "x", state: "uploading" }, { localId: "y", state: "uploading" }, { localId: "z", state: "queued" }])).toEqual([]);
  });
});

describe("compose error messages", () => {
  it("AC2, AC4, AC7 (R3, R4, R8): each refused save names its reason", () => {
    expect(saveErrorKey("entry_empty")).toBe("compose.emptyHint");
    expect(saveErrorKey("entry_text_too_long")).toBe("compose.tooLong");
    expect(saveErrorKey("invalid_entry_date")).toBe("compose.dateError");
    expect(saveErrorKey("too_many_photos")).toBe("compose.limit");
    expect(saveErrorKey("photo_invalid")).toBe("compose.photoExpired");
    expect(saveErrorKey("not_author")).toBe("compose.notAuthor");
    expect(saveErrorKey("not_found")).toBe("compose.gone");
    expect(saveErrorKey(undefined)).toBe("compose.saveError");
    expect(saveErrorKey("server_error")).toBe("compose.saveError");
  });

  it("AC12, AC13 (R16, R18): a refused upload says why, a dropped one offers retry", () => {
    expect(uploadErrorKey("photo_too_large")).toBe("compose.photoTooLarge");
    expect(uploadErrorKey("photo_invalid")).toBe("compose.photoRejected");
    expect(uploadErrorKey("unsupported_photo_type")).toBe("compose.photoRejected");
    expect(uploadErrorKey("too_many_pending_photos")).toBe("compose.photoTooMany");
    expect(uploadErrorKey(undefined)).toBe("compose.photoFailed");
  });
});
