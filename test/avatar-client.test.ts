import { afterEach, describe, expect, it, vi } from "vitest";
import { api, avatarUrl } from "../src/client/api";
import { avatarFileError, avatarRetryWait, renderAvatar } from "../src/client/lib/photo";
import type { User } from "../src/shared/types";
import type { Translate } from "../src/client/i18n";
import { vi as messages } from "../src/client/i18n/vi";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("profile photo client", () => {
  it.each([
    [undefined, "1 minute", "1 phút"],
    [1, "1 minute", "1 phút"],
    [61, "2 minutes", "2 phút"],
    [3600, "1 hour", "1 giờ"],
    [3601, "2 hours", "2 giờ"],
    [10800, "3 hours", "3 giờ"],
  ])("formats the retry wait for %s seconds", (seconds, en, vi) => {
    expect(avatarRetryWait("en", seconds)).toBe(en);
    expect(avatarRetryWait("vi", seconds)).toBe(vi);
  });
  it.each(["image/jpeg", "image/png", "image/heic", "image/heif"])("avatar AC3 R4: accepts %s", (type) => {
    expect(avatarFileError(new File(["photo"], "photo", { type }))).toBeNull();
  });
  it("avatar AC3 R4: accepts untyped photo extensions but refuses PDF and WebP input", () => {
    expect(avatarFileError(new File(["photo"], "PHOTO.HEIC"))).toBeNull();
    for (const type of ["application/pdf", "image/webp"]) {
      expect(avatarFileError(new File(["file"], "file.jpg", { type }))).toBe("avatar.wrongType");
    }
  });
  it("avatar AC4 R5: refuses 25 MB before framing and accepts 19 MB", () => {
    expect(avatarFileError(new File([new Uint8Array(25 * 1024 * 1024)], "photo.jpg", { type: "image/jpeg" }))).toBe("avatar.tooLarge");
    expect(avatarFileError(new File([new Uint8Array(19 * 1024 * 1024)], "photo.jpg", { type: "image/jpeg" }))).toBeNull();
  });
  it("avatar AC5 R6: keeps only the framed square, upscales to 512, and frees bitmap and canvas", async () => {
    const drawImage = vi.fn();
    const bitmap = { close: vi.fn() } as unknown as ImageBitmap;
    const canvas = { width: 0, height: 0, getContext: () => ({ drawImage }), toBlob: (done: BlobCallback) => done(new Blob(["pixels"], { type: "image/webp" })) };
    vi.stubGlobal("document", { createElement: () => canvas });
    const blob = await renderAvatar(bitmap, { x: 10, y: 20, width: 100, height: 100 });
    expect(drawImage).toHaveBeenCalledWith(bitmap, 10, 20, 100, 100, 0, 0, 512, 512);
    expect(blob.type).toBe("image/webp");
    expect(bitmap.close).toHaveBeenCalled();
    expect(canvas.width).toBe(0);
    expect(canvas.height).toBe(0);
  });
  it("avatar AC2 AC7: sends multipart without a JSON header and removes through the self endpoint", async () => {
    const fetch = vi.fn(async (_url: string, _init?: RequestInit) => Response.json({ user: { avatarId: "new" } }));
    vi.stubGlobal("fetch", fetch);
    expect((await api.setAvatar(new Blob(["pixels"], { type: "image/jpeg" })))).toMatchObject({ ok: true });
    expect(fetch.mock.calls[0]?.[0]).toBe("/api/me/avatar");
    expect(fetch.mock.calls[0]?.[1]?.method).toBe("PUT");
    expect(fetch.mock.calls[0]?.[1]?.headers).toBeUndefined();
    expect(fetch.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);
    await api.removeAvatar();
    expect(fetch.mock.calls[1]?.[1]?.method).toBe("DELETE");
    expect(avatarUrl("a/b", "c/d")).toBe("/api/avatars/a%2Fb/c%2Fd");
  });
  it("avatar AC11 R14: a network failure returns no replacement user", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));
    expect(await api.setAvatar(new Blob(["pixels"]))).toEqual({ ok: false, status: 0, error: null });
  });
  it("avatar AC8 R9 R10: both people carry photos and self changes override stale couple data", async () => {
    const { toPeople } = await import("../src/client/components/bisou/CoupleAvatars");
    const t: Translate = (key) => messages[key];
    const user: User = { id: "a", displayName: "An", email: "an@example.com", birthDate: null, avatarId: "new", locale: "vi", createdAt: 0 };
    const members = [{ ...user, avatarId: "old" }, { id: "b", displayName: "Binh", birthDate: null, avatarId: "partner" }];
    expect(toPeople(members, user, t).map((p) => [p.name, p.photoUrl, p.tone])).toEqual([
      ["An", "/api/avatars/a/new", "primary"], ["Binh", "/api/avatars/b/partner", "secondary"],
    ]);
    expect(toPeople(members, { ...user, avatarId: null }, t)[0]?.photoUrl).toBeUndefined();
    expect(toPeople([user], { ...user, displayName: null }, t)[0]).toMatchObject({ name: "an", initial: "A" });
    expect(toPeople([{ ...members[1]!, displayName: null }], user, t)[0]).toMatchObject({ name: messages["common.person"], initial: "Ấ" });
  });
});
