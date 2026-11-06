import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { avatarUrl } from "../../api";
import type { CoupleMember, User } from "../../../shared/types";

export interface Person {
  name: string;
  photoUrl?: string;
  /* Each partner keeps one tint everywhere: primary for one, secondary for the other. */
  tone: "primary" | "secondary";
}

export function toPeople(members: CoupleMember[], user: User): (Person & { birthDate: string | null })[] {
  return members.map((member, index) => {
    const person = member.id === user.id ? user : member;
    return {
      name: person.displayName ?? (member.id === user.id ? user.email : "?"),
      birthDate: person.birthDate,
      photoUrl: person.avatarId ? avatarUrl(member.id, person.avatarId) : undefined,
      tone: index === 0 ? "primary" : "secondary",
    };
  });
}

const TONE: Record<Person["tone"], string> = {
  primary: "bg-primary text-primary-foreground",
  secondary: "bg-secondary text-secondary-foreground",
};

const SIZE = {
  sm: "size-8 text-sm",
  md: "size-11 text-base",
  lg: "size-16 text-xl",
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? "";
  return last.slice(0, 1).toUpperCase();
}

export function PersonAvatar({ person, size = "md", className }: { person: Person; size?: keyof typeof SIZE; className?: string }) {
  return (
    <Avatar className={cn(SIZE[size], "edge-ink after:hidden", className)}>
      {person.photoUrl && <AvatarImage src={person.photoUrl} alt="" />}
      <AvatarFallback className={cn("font-heading", TONE[person.tone])}>{initials(person.name)}</AvatarFallback>
    </Avatar>
  );
}

/* Two partners side by side, overlapping; the accessible name reads "An and Minh". */
export function CoupleAvatars({ people, size = "md", className }: { people: [Person, Person]; size?: keyof typeof SIZE; className?: string }) {
  const { t } = useI18n();
  return (
    <div role="img" aria-label={t("couple.and", { a: people[0].name, b: people[1].name })} className={cn("flex items-center", className)}>
      <PersonAvatar person={people[0]} size={size} className="ring-3 ring-card" />
      <PersonAvatar person={people[1]} size={size} className="-ml-2 ring-3 ring-card" />
    </div>
  );
}
