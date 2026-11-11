import { Mailbox } from "lucide-react";
import { useI18n } from "@/i18n";
import { Card } from "@/components/ui/card";
export function NotesInbox({ count, onOpen }: { count: number; onOpen: () => void }) {
  const { t } = useI18n();
  if (!count) return null;
  return <Card className="relative mt-5 gap-2 p-4"><button type="button" className="absolute inset-0 min-h-11 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring" aria-label={`${t("home.notes")}: ${t(count === 1 ? "home.notesWaitingOne" : "home.notesWaiting", { n: count })}`} onClick={onOpen} /><p className="flex items-center gap-2 font-semibold"><Mailbox className="mailbox-wait" aria-hidden="true" />{t("home.notes")}</p><p>{t(count === 1 ? "home.notesWaitingOne" : "home.notesWaiting", { n: count })}</p></Card>;
}
