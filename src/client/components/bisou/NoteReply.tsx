import type { NotePick } from "../../../shared/types";
import { useI18n } from "@/i18n";
import { PersonAvatar, type Person } from "./CoupleAvatars";
export interface Reply { person: Person; pick: NotePick; line: string }
export function NoteReply({ reply }: { reply: Reply }) {
  const { t } = useI18n();
  return <div className="flex flex-col gap-2 border-t pt-3"><p className="flex items-center gap-2 font-semibold"><PersonAvatar person={reply.person} size="sm" />{reply.person.name}</p><p>{t(`notes.pick.${reply.pick}`)}</p>{reply.line && <p className="whitespace-pre-wrap wrap-anywhere">{t("notes.line")} {reply.line}</p>}</div>;
}
