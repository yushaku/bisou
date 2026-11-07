import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";

function worker() {
  const listeners: Record<string, (event: any) => void> = {};
  const showNotification = vi.fn().mockResolvedValue(undefined);
  const clients = { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn().mockResolvedValue(undefined) };
  runInNewContext(readFileSync(new URL("../public/push-sw.js", import.meta.url), "utf8"), {
    self: { addEventListener: (name: string, fn: (event: any) => void) => { listeners[name] = fn; }, registration: { showNotification }, clients, location: { origin: "https://bisou.example" } }, URL,
  });
  async function dispatch(name: string, event: object) {
    let promise: Promise<unknown> | undefined;
    listeners[name]!({ ...event, waitUntil: (p: Promise<unknown>) => { promise = p; } });
    await promise;
  }
  return { dispatch, showNotification, clients };
}

it("AC3, R19: shows the title and replacement tag with a journal destination", async () => {
  const sw = worker();
  await sw.dispatch("push", { data: { json: () => ({ title: "An vừa viết nhật ký", tag: "journal", url: "/journal" }) } });
  expect(sw.showNotification).toHaveBeenCalledWith("An vừa viết nhật ký", { tag: "journal", renotify: true, icon: "/icons/icon-192.png", data: { url: "/journal" } });
});
it("R1: unreadable push always shows a Bisou fallback", async () => {
  const sw = worker();
  await sw.dispatch("push", { data: { json: () => { throw new Error("bad payload"); } } });
  expect(sw.showNotification).toHaveBeenCalledWith("Bisou", expect.objectContaining({ data: { url: "/" } }));
});
it.each(["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", null])("AC3, AC16, R15: rejects unsafe click URL %s", async (url) => {
  const sw = worker(); const close = vi.fn();
  await sw.dispatch("notificationclick", { notification: { close, data: { url } } });
  expect(close).toHaveBeenCalledOnce(); expect(sw.clients.openWindow).toHaveBeenCalledWith("/");
});
it("AC3, AC16: focuses and navigates an existing window", async () => {
  const sw = worker(); const window = { focus: vi.fn().mockResolvedValue(undefined), navigate: vi.fn().mockResolvedValue(undefined) };
  sw.clients.matchAll.mockResolvedValue([window]);
  await sw.dispatch("notificationclick", { notification: { close: vi.fn(), data: { url: "/events" } } });
  expect(window.focus).toHaveBeenCalledOnce(); expect(window.navigate).toHaveBeenCalledWith("/events");
  expect(sw.clients.openWindow).not.toHaveBeenCalled();
});
