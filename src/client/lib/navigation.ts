export const TAB_PATH = { home: "/", journal: "/journal", wishes: "/wishes" } as const;
export type CreateDestination = "journal" | "wishes";

export function readCreateRequest(state: unknown): CreateDestination | null {
  if (!state || typeof state !== "object") return null;
  const request = (state as { create?: unknown }).create;
  return request === "journal" || request === "wishes" ? request : null;
}
