import { isPairCode, normalizePairCode } from "../../shared/pairCode";

// A /join?code=XXXXXX link must survive the login round trip, so the code waits in
// sessionStorage (this tab only) until the pairing screen uses it.
const KEY = "bisou.joinCode";

/** Reads /join?code= once at startup, stores the code and cleans the address bar. */
export function captureJoinLink(): void {
  if (location.pathname !== "/join") return;
  const code = normalizePairCode(new URLSearchParams(location.search).get("code") ?? "");
  try {
    if (isPairCode(code)) sessionStorage.setItem(KEY, code);
  } catch {
    // Storage blocked: the partner can still type the code.
  }
  history.replaceState(null, "", "/");
}

export function pendingJoinCode(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearJoinCode(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing stored.
  }
}

export function joinLink(code: string): string {
  return `${location.origin}/join?code=${encodeURIComponent(code)}`;
}
