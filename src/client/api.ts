import type {
  ApiError,
  PushState,
  PushDevice,
  PushSubscriptionInput,
  Wish,
  SpinWish,
  Claim,
  WishInput,
  ReceiveWishInput,
  CoupleResponse,
  CoupleEventInput,
  EntryInput,
  JournalEntry,
  JournalPage,
  Locale,
  MeResponse,
  PhotoSize,
  RequestCodeResponse,
  User,
} from "../shared/types";
import type { GardenState, GardenCardState, GardenDeckState, GardenLevels, GardenStageAnswers, LevelAction, GardenAnswerInput, RelationshipLevel } from "../shared/garden";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError | null };

async function call<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    // credentials default to same-origin, so the session cookie goes along.
    res = await fetch(path, {
      method,
      headers: body === undefined || body instanceof FormData ? undefined : { "Content-Type": "application/json" },
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
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
  gardenLevels: (body: LevelAction) => call<{ levels: GardenLevels }>("POST", "/api/garden/levels", body),
  garden: () => call<GardenState>("GET", "/api/garden"),
  gardenDeck: (id: string) => call<GardenDeckState>("GET", `/api/garden/decks/${encodeURIComponent(id)}`),
  gardenStage: (levelId: RelationshipLevel) => call<GardenStageAnswers>("GET", `/api/garden/stages/${encodeURIComponent(levelId)}`),
  swapGarden: (cardId: string) => call<GardenState>("POST", "/api/garden/today/swap", { cardId }),
  answerGarden: (id: string, response: string | GardenAnswerInput) => call<{ card: GardenCardState }>("POST", `/api/garden/cards/${encodeURIComponent(id)}/answer`, typeof response === "string" ? { text: response } : response),
  editGardenAnswer: (id: string, response: string | GardenAnswerInput) => call<{ card: GardenCardState }>("PUT", `/api/garden/cards/${encodeURIComponent(id)}/answer`, typeof response === "string" ? { text: response } : response),
  deleteGardenAnswer: (id: string) => call<{ card: GardenCardState }>("DELETE", `/api/garden/cards/${encodeURIComponent(id)}/answer`),
  setAvatar: (blob: Blob) => {
    const form = new FormData();
    form.set("photo", blob, blob.type === "image/webp" ? "avatar.webp" : "avatar.jpg");
    return call<{ user: User }>("PUT", "/api/me/avatar", form);
  },
  removeAvatar: () => call<{ user: User }>("DELETE", "/api/me/avatar"),
  updateEvent: (id: string, input: CoupleEventInput) => call<CoupleResponse>("PUT", `/api/events/${encodeURIComponent(id)}`, input),
  deleteEvent: (id: string) => call<CoupleResponse>("DELETE", `/api/events/${encodeURIComponent(id)}`),
  createEvent: (input: CoupleEventInput) => call<CoupleResponse>("POST", "/api/events", input),
  receiveWish: (id: string, input: ReceiveWishInput) => call<{ wish: Wish; entry: JournalEntry }>("POST", `/api/wishes/${encodeURIComponent(id)}/received`, input),
  spin: (budget: number) => call<{ wish: SpinWish | null }>("POST", "/api/wishes/spin", { budget }),
  claim: (id: string) => call<{ claim: Claim }>("POST", `/api/wishes/${encodeURIComponent(id)}/claim`),
  claims: () => call<{ claims: Claim[] }>("GET", "/api/wishes/claims"),
  acknowledgeClaimNotice: (id: string) => call<{ ok: true }>("POST", `/api/wishes/claims/${encodeURIComponent(id)}/ack`),
  releaseClaim: (id: string) => call<{ ok: true }>("DELETE", `/api/wishes/claims/${encodeURIComponent(id)}`),
  wishes: () => call<{ open: Wish[]; received: Wish[]; partnerJarEmpty: boolean }>("GET", "/api/wishes"),
  createWish: (input: WishInput) => call<{ wish: Wish }>("POST", "/api/wishes", input),
  updateWish: (id: string, input: WishInput) => call<{ wish: Wish }>("PUT", `/api/wishes/${encodeURIComponent(id)}`, input),
  deleteWish: (id: string) => call<{ ok: true }>("DELETE", `/api/wishes/${encodeURIComponent(id)}`),
  me: () => call<MeResponse>("GET", "/api/me"),
  updateMe: (patch: { displayName?: string; locale?: Locale; birthDate?: string | null }) =>
    call<{ user: User }>("PATCH", "/api/me", patch),
  requestCode: (email: string, lang: Locale) =>
    call<RequestCodeResponse>("POST", "/api/auth/request", { email, lang }),
  verifyCode: (email: string, code: string, lang: Locale) =>
    call<{ user: User }>("POST", "/api/auth/verify", { email, code, lang }),
  logout: (endpoint?: string) => call<{ ok: true }>("POST", "/api/auth/logout", endpoint ? { endpoint } : undefined),
  push: () => call<PushState>("GET", "/api/push"),
  savePush: (body: PushSubscriptionInput) => call<{ device: PushDevice | null }>("PUT", "/api/push/subscription", body),
  deletePush: (endpoint: string) => call<{ ok: true }>("DELETE", "/api/push/subscription", { endpoint }),
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

export function avatarUrl(userId: string, avatarId: string): string {
  return `/api/avatars/${encodeURIComponent(userId)}/${encodeURIComponent(avatarId)}`;
}
