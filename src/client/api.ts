import type { ApiError, CoupleResponse, Locale, MeResponse, RequestCodeResponse, User } from "../shared/types";

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: ApiError | null };

async function call<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: "same-origin",
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
};
