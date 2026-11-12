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

it("notifications R15: opens a new window when existing client navigation rejects", async () => {
  const sw = worker();
  sw.clients.matchAll.mockResolvedValue([{ focus: vi.fn().mockResolvedValue(undefined), navigate: vi.fn().mockRejectedValue(new Error("closed")) }]);
  await sw.dispatch("notificationclick", { notification: { close: vi.fn(), data: { url: "/events" } } });
  expect(sw.clients.openWindow).toHaveBeenCalledWith("/events");
});

it("notifications AC3, R19: shows the title and replacement tag with a journal destination", async () => {
  const sw = worker();
  await sw.dispatch("push", { data: { json: () => ({ title: "An vừa viết nhật ký", tag: "journal", url: "/journal" }) } });
  expect(sw.showNotification).toHaveBeenCalledWith("An vừa viết nhật ký", { tag: "journal", renotify: true, icon: "/icons/icon-192.png", data: { url: "/journal" } });
});
it("an unreadable push still shows a Bisou notification", async () => {
  const sw = worker();
  await sw.dispatch("push", { data: { json: () => { throw new Error("bad payload"); } } });
  expect(sw.showNotification).toHaveBeenCalledWith("Bisou", expect.objectContaining({ data: { url: "/" } }));
});
it("garden R32 AC9: shows a private garden notification and opens its route", async () => {
  const sw = worker();
  await sw.dispatch("push", { data: { json: () => ({ title: "Both answered", tag: "garden", url: "/garden" }) } });
  expect(sw.showNotification).toHaveBeenCalledWith("Both answered", expect.objectContaining({ tag: "garden", data: { url: "/garden" } }));
  await sw.dispatch("notificationclick", { notification: { close: vi.fn(), data: { url: "/garden" } } });
  expect(sw.clients.openWindow).toHaveBeenCalledWith("/garden");
});
it.each(["https://evil.test", "//evil.test", "/\\evil.test", "javascript:alert(1)", null])("notifications AC3, R15: rejects unsafe click URL %s", async (url) => {
  const sw = worker(); const close = vi.fn();
  await sw.dispatch("notificationclick", { notification: { close, data: { url } } });
  expect(close).toHaveBeenCalledOnce(); expect(sw.clients.openWindow).toHaveBeenCalledWith("/");
});
it("notifications AC3, R15: focuses and navigates an existing window", async () => {
  const sw = worker(); const window = { focus: vi.fn().mockResolvedValue(undefined), navigate: vi.fn().mockResolvedValue(undefined) };
  sw.clients.matchAll.mockResolvedValue([window]);
  await sw.dispatch("notificationclick", { notification: { close: vi.fn(), data: { url: "/events" } } });
  expect(window.focus).toHaveBeenCalledOnce(); expect(window.navigate).toHaveBeenCalledWith("/events");
  expect(sw.clients.openWindow).not.toHaveBeenCalled();
});
