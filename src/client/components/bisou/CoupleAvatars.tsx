import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useI18n, type Translate } from "../../i18n";
import { displayName } from "../../lib/displayName";
import { cn } from "../../lib/utils";
import { avatarUrl } from "../../api";
import type { CoupleMember, User } from "../../../shared/types";

export interface Person {
  name: string;
  initial?: string;
  photoUrl?: string;
  /* Each partner keeps one tint everywhere: primary for one, secondary for the other. */
  tone: "primary" | "secondary";
}

export function toPeople(members: CoupleMember[], user: User, t: Translate): (Person & { birthDate: string | null })[] {
  return members.map((member, index) => {
    const person = member.id === user.id ? user : member;
    const name = displayName(person, t);
    return {
      name,
      initial: initials(name),
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
  xl: "size-48 text-5xl",
  full: "size-full text-7xl",
} as const;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const last = parts[parts.length - 1] ?? "";
  return last.slice(0, 1).toUpperCase();
}

export function PersonAvatar({
  person,
  size = "md",
  className,
}: {
  person: Person;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <Avatar className={cn(SIZE[size], "edge-ink after:hidden", className)}>
      {person.photoUrl && <AvatarImage src={person.photoUrl} alt="" />}
      <AvatarFallback className={cn("font-heading", TONE[person.tone])}>
        {person.initial ?? initials(person.name)}
      </AvatarFallback>
    </Avatar>
  );
}

/* Two partners side by side, overlapping; the accessible name reads "An and Minh". */
export function CoupleAvatars({
  people,
  size = "md",
  className,
  onSelect,
}: {
  people: [Person, Person];
  size?: keyof typeof SIZE;
  className?: string;
  /* When set, each avatar is a button that opens that person's photo. */
  onSelect?: (person: Person) => void;
}) {
  const { t } = useI18n();
  const avatars = people.map((person, index) => (
    <PersonAvatar
      key={person.name}
      person={person}
      size={size}
      className={cn(index === 1 && "-ml-2", "ring-3 ring-card")}
    />
  ));
  if (!onSelect)
    return (
      <div
        role="img"
        aria-label={t("couple.and", { a: people[0].name, b: people[1].name })}
        className={cn("flex items-center", className)}
      >
        {avatars}
      </div>
    );
  return (
    <div className={cn("flex items-center", className)}>
      {people.map((person, index) => (
        <button
          key={person.name}
          type="button"
          aria-label={t("avatar.view", { name: person.name })}
          className={cn(
            "relative shrink-0 press rounded-full outline-none after:absolute after:-inset-1.5 after:content-[''] focus-visible:ring-3 focus-visible:ring-ring",
            index === 1 && "-ml-2",
          )}
          onClick={() => onSelect(person)}
        >
          <PersonAvatar person={person} size={size} className="ring-3 ring-card" />
        </button>
      ))}
    </div>
  );
}
