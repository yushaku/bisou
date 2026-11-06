import type { Translate } from "../i18n";

export function displayName(person: { displayName?: string | null; email?: string } | null | undefined, t: Translate): string {
  return person?.displayName?.trim() || person?.email?.split("@")[0]?.trim() || t("common.person");
}
