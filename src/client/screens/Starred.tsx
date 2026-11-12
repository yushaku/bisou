import type { Couple } from "../../shared/types";
import { BottomBar } from "../components/bisou/AppShell";
import { StarredBlock } from "../components/bisou/StarredCards";
import { SubPageHeader } from "../components/bisou/SubPageHeader";
import { useI18n } from "../i18n";
import { useTabNavigation } from "../lib/useTabNavigation";
import type { SessionProps } from "./SignedInShell";

export function Starred({ couple, user, onSignedOut }: SessionProps & { couple: Couple }) {
  const { t } = useI18n();
  const navigation = useTabNavigation();
  return <div className="flex min-h-dvh flex-col"><SubPageHeader title={t("home.starred")} />
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-3 pb-28"><StarredBlock full couple={couple} user={user} onSignedOut={onSignedOut} /></main>
    <BottomBar active="home" {...navigation} />
  </div>;
}
