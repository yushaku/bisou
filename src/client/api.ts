import type {
  ApiError,
  Wish,
  SpinWish,
  Claim,
  WishInput,
  ReceiveWishInput,
  CoupleResponse,
  EntryInput,
  JournalEntry,
  JournalPage,
  Locale,
  MeResponse,
  PhotoSize,
  RequestCodeResponse,
  User,
} from "../shared/types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError | null };

async function call<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    // credentials default to same-origin, so the session cookie goes along.
    res = await fetch(path, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    return { ok: false, status: 0, error: null };
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }
  if (res.ok) return { ok: true, data: json as T };
  const error = json && typeof json === "object" && "error" in json ? (json as ApiError) : null;
  return { ok: false, status: res.status, error };
}

export const api = {
  receiveWish: (id: string, input: ReceiveWishInput) => call<{ wish: Wish; entry: JournalEntry }>("POST", `/api/wishes/${encodeURIComponent(id)}/received`, input),
  spin: (budget: number) => call<{ wish: SpinWish | null }>("POST", "/api/wishes/spin", { budget }),
  claim: (id: string) => call<{ claim: Claim }>("POST", `/api/wishes/${encodeURIComponent(id)}/claim`),
  claims: () => call<{ claims: Claim[] }>("GET", "/api/wishes/claims"),
  releaseClaim: (id: string) => call<{ ok: true }>("DELETE", `/api/wishes/claims/${encodeURIComponent(id)}`),
  wishes: () => call<{ open: Wish[]; received: Wish[] }>("GET", "/api/wishes"),
  createWish: (input: WishInput) => call<{ wish: Wish }>("POST", "/api/wishes", input),
  updateWish: (id: string, input: WishInput) => call<{ wish: Wish }>("PUT", `/api/wishes/${encodeURIComponent(id)}`, input),
  deleteWish: (id: string) => call<{ ok: true }>("DELETE", `/api/wishes/${encodeURIComponent(id)}`),
  me: () => call<MeResponse>("GET", "/api/me"),
  updateMe: (patch: { displayName?: string; locale?: Locale }) =>
    call<{ user: User }>("PATCH", "/api/me", patch),
  requestCode: (email: string, lang: Locale) =>
    call<RequestCodeResponse>("POST", "/api/auth/request", { email, lang }),
  verifyCode: (email: string, code: string, lang: Locale) =>
    call<{ user: User }>("POST", "/api/auth/verify", { email, code, lang }),
  logout: () => call<{ ok: true }>("POST", "/api/auth/logout"),
  couple: () => call<CoupleResponse>("GET", "/api/couple"),
  createCouple: () => call<CoupleResponse>("POST", "/api/couple"),
  newPairCode: () => call<CoupleResponse>("POST", "/api/couple/code"),
  joinCouple: (code: string) => call<CoupleResponse>("POST", "/api/couple/join", { code }),
  setStartDate: (startDate: string) => call<CoupleResponse>("PATCH", "/api/couple", { startDate }),
  journal: (cursor?: string) =>
    call<JournalPage>("GET", cursor ? `/api/journal?cursor=${encodeURIComponent(cursor)}` : "/api/journal"),
  createEntry: (input: EntryInput) => call<{ entry: JournalEntry }>("POST", "/api/journal", input),
  updateEntry: (id: string, input: EntryInput) =>
    call<{ entry: JournalEntry }>("PUT", `/api/journal/${encodeURIComponent(id)}`, input),
  deletePhoto: (id: string) => call<{ ok: true }>("DELETE", `/api/photos/${encodeURIComponent(id)}`),
  deleteEntry: (id: string) => call<{ ok: true }>("DELETE", `/api/journal/${encodeURIComponent(id)}`),
};

export function photoUrl(id: string, size: PhotoSize): string {
  return `/api/photos/${encodeURIComponent(id)}/${size}`;
}
