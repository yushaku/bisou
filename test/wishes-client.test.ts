import { describe, expect, it } from "vitest";
import { parseVnd, wishSaveBlock } from "../src/client/lib/wishes";
import { saveBlock } from "../src/client/lib/compose";
import { receivedText } from "../src/shared/wishes";

const form = { title: "Scarf", price: null, link: null, photoId: null };
describe("wish forms", () => {
  it("AC2 (R3-R5): accepts optional price and locale separators, rejects invalid amounts", () => {
    expect(parseVnd("")).toBeNull();
    for (const input of ["450.000", "450,000", "450 000"]) expect(parseVnd(input)).toBe(450000);
    for (const input of ["abc", "1.5", "450,000.00", "45,00", "-1"]) expect(parseVnd(input)).toBeNaN();
    expect(wishSaveBlock(form, [])).toBeNull();
    expect(wishSaveBlock({ ...form, title: " " }, [])).toBe("wish.titleInvalid");
    for (const price of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) expect(wishSaveBlock({ ...form, price }, [])).toBe("wish.priceInvalid");
    expect(wishSaveBlock({ ...form, link: "javascript:alert(1)" }, [])).toBe("wish.linkInvalid");
  });
  it("AC13 (R6): refuses saving a photo still uploading or failed", () => {
    for (const state of ["queued", "uploading", "failed"] as const) expect(wishSaveBlock(form, [{ state }])).toBe("compose.waitPhotos");
    expect(wishSaveBlock(form, [{ state: "done" }])).toBeNull();
  });
  it("AC12 (R20): includes prefix and title in the 2000 code point limit, in both languages", () => {
    expect(receivedText("vi", "Khăn linen", "  Mềm quá  ")).toBe("Đã nhận: Khăn linen. Mềm quá");
    expect(receivedText("en", "Linen scarf", " ")).toBe("Received: Linen scarf");
    for (const locale of ["vi", "en"] as const) {
      const room = 2000 - Array.from(receivedText(locale, "💛", "x")).length + 1;
      const text = receivedText(locale, "💛", "💛".repeat(room));
      expect(Array.from(text)).toHaveLength(2000);
      expect(saveBlock({ date: "2023-02-12", text, photos: [] }, Date.now())).toBeNull();
      expect(saveBlock({ date: "2023-02-12", text: text + "x", photos: [] }, Date.now())).toBe("tooLong");
    }
  });
});
