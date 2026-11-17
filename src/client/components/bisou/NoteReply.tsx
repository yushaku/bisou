import { cn } from "@/lib/utils";
import { PersonAvatar, type Person } from "./CoupleAvatars";
export interface Reply { person: Person; line: string }
export function NoteReply({ reply, preview = false }: { reply: Reply; preview?: boolean }) {
  return <div className="flex min-w-0 flex-col gap-3 rounded-xl bg-muted p-4"><p className="flex items-center gap-2 font-semibold"><PersonAvatar person={reply.person} size="sm" />{reply.person.name}</p>{reply.line && <p className={cn("text-base leading-6 whitespace-pre-wrap wrap-anywhere", preview && "line-clamp-3")}>{reply.line}</p>}</div>;
}
