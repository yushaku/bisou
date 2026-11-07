export const TAB_PATH = { home: "/", journal: "/journal", wishes: "/wishes", garden: "/garden" } as const;
export type CreateDestination = "journal" | "wishes" | "event" | "spin";

export function readCreateRequest(state: unknown): CreateDestination | null {
  if (!state || typeof state !== "object") return null;
  const request = (state as { create?: unknown }).create;
  return request === "journal" || request === "wishes" || request === "event" || request === "spin" ? request : null;
}

export function tabMove(location: string, from: string | undefined, path: string, create?: CreateDestination): "scroll" | "back" | "replace" | "push" {
  if (from === path) return "back";
  if (location === path && !create) return "scroll";
  return location === path || from || location.startsWith("/settings") || location === "/events" ? "replace" : "push";
}

export function readShortcutRequest(path: string, search: string): CreateDestination | null {
  const query = new URLSearchParams(search);
  if (path === "/journal" && query.get("compose") === "1") return "journal";
  if (path === "/wishes" && query.get("spin") === "1") return "spin";
  return null;
}

export function captureShortcut() {
  const create = readShortcutRequest(location.pathname, location.search);
  if (!create) return;
  const query = new URLSearchParams(location.search);
  query.delete(create === "journal" ? "compose" : "spin");
  const search = query.toString();
  history.replaceState({ ...history.state, create, shortcut: true }, "", `${location.pathname}${search ? `?${search}` : ""}${location.hash}`);
}
