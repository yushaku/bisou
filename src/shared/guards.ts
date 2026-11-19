/** Narrows a value the caller knows exists; throws where unchecked access would have crashed later. */
export function defined<T>(value: T | null | undefined, message = "Expected a value"): T {
  if (value === null || value === undefined) throw new Error(message);
  return value;
}

/** True for non-null objects (arrays included); the first step of validating untrusted JSON. */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Deliberate "do nothing" callback for fire-and-forget promises and required props. */
export const noop = (): undefined => undefined;
