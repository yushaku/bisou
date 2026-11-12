import { afterEach, expect, it, vi } from "vitest";
import { permissionPromptHidden } from "../src/client/lib/push";

afterEach(() => { vi.unstubAllGlobals(); });

it("notifications R21: a subscribe refused while the permission is still undecided means the browser hid its prompt", () => {
  vi.stubGlobal("Notification", { permission: "default" });
  expect(permissionPromptHidden(new DOMException("Registration failed - permission denied", "NotAllowedError"))).toBe(true);
  expect(permissionPromptHidden(new DOMException("push service error", "AbortError"))).toBe(false);
  expect(permissionPromptHidden(new Error("push save failed"))).toBe(false);
});

it("notifications R22: a blocked permission keeps its own message", () => {
  vi.stubGlobal("Notification", { permission: "denied" });
  expect(permissionPromptHidden(new DOMException("denied", "NotAllowedError"))).toBe(false);
});
