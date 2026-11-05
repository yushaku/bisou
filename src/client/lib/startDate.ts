import type { ApiError } from "../../shared/types";
import type { MessageKey } from "../i18n/vi";

export function startDateError(t: (key: MessageKey) => string, status: number, error: ApiError | null): string {
  if (status === 0) return t("error.network");
  return error?.error === "invalid_start_date" ? t("error.invalid_start_date") : t("error.generic");
}
