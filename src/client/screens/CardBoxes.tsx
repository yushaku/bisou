import type { SessionProps } from "./SignedInShell";
import { BottomBar } from "../components/bisou/AppShell";
import { SubPageHeader } from "../components/bisou/SubPageHeader";
import { CardBoxList } from "../components/bisou/CardBoxBlock";
import { useCardBoxes } from "../lib/useCardBoxes";
import { useTabNavigation } from "../lib/useTabNavigation";
import { useI18n } from "../i18n";
export function CardBoxes({ onSignedOut }: SessionProps) {
  const { t } = useI18n();
  const data = useCardBoxes(onSignedOut);
  const navigation = useTabNavigation();
  return <div className="flex min-h-dvh flex-col"><SubPageHeader title={t("cardBox.title")} />
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-3 pb-[max(--spacing(6),env(safe-area-inset-bottom))]"><CardBoxList {...data} from="/boxes" /></main>
    <BottomBar active="home" {...navigation} />
  </div>;
}
