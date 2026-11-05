export const TAB_PATH = { home: "/", journal: "/journal", wishes: "/wishes" } as const;
export type CreateDestination = "journal" | "wishes";

export function readCreateRequest(state: unknown): CreateDestination | null {
  if (!state || typeof state !== "object") return null;
  const request = (state as { create?: unknown }).create;
  return request === "journal" || request === "wishes" ? request : null;
}

export function tabMove(location: string, from: string | undefined, path: string, create?: CreateDestination): "scroll" | "back" | "replace" | "push" {
  if (from === path) return "back";
  if (location === path && !create) return "scroll";
  return location === path || from || location === "/settings" || location === "/events" ? "replace" : "push";
}
