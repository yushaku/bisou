import type { ApiResult } from "../api";

export class ApiQueryError extends Error {
  constructor(
    readonly status: number,
    readonly error: Extract<ApiResult<unknown>, { ok: false }>["error"],
  ) {
    super(error?.error ?? `HTTP ${status}`);
  }
}
