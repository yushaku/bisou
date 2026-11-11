import { NOTE_FIELDS, NOTE_FIELD_MAX } from "../../shared/notes";
import type { NoteInput, NoteLists } from "../../shared/types";
import type { Translate } from "../i18n";
export function noteBlock(input: NoteInput): "tooLong" | "empty" | null {
  if (NOTE_FIELDS.some((field) => Array.from(input[field].trim()).length > NOTE_FIELD_MAX)) return "tooLong";
  if (NOTE_FIELDS.some((field) => !input[field].replace(/\p{Cf}/gu, "").trim())) return "empty";
  return null;
}
const phrases = ["lúc nào cũng", "luôn luôn", "không bao giờ", "chẳng bao giờ", "chả bao giờ", "lần nào cũng", "suốt ngày", "(?<!hiện )tại (?:vì )?(?:anh|em)", "lỗi (?:của )?(?:anh|em)", "always", "never", "every time", "all the time", "your fault", "because of you"];
export function softHints(text: string): string[] {
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])(?:${phrases.join("|")})(?![\\p{L}\\p{N}])`, "giu");
  return [...new Set(text.normalize("NFC").toLowerCase().match(pattern) ?? [])];
}

export function waitingCount(lists: NoteLists | null): number {
  return lists?.toMe.filter((note) => note.state === "waiting").length ?? 0;
}
export function noteText(t: Translate, note: NoteInput): string {
  return NOTE_FIELDS.map((field) => `${t(`notes.${field}`)}\n${note[field]}`).join("\n\n");
}
