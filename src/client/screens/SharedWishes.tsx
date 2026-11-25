import { Check, Ellipsis, PencilLine, Plus, Trash2 } from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { toast } from "@/components/ui/ding-toaster";
import type { Couple, SharedWish } from "../../shared/types";
import { api } from "../api";
import { useApiMutation } from "../lib/serverQuery";
import { Celebration } from "../components/bisou/Celebration";
import { EmptyState } from "../components/bisou/EmptyState";
import { PersonAvatar, toPeople } from "../components/bisou/CoupleAvatars";
import { WishJar } from "../components/bisou/WishJar";
import { WishCard } from "../components/bisou/WishCard";
import { WishDetailSheet } from "../components/bisou/WishDetailSheet";
import { Button } from "../components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../components/ui/drawer";
import { Skeleton } from "../components/ui/skeleton";
import { useI18n } from "../i18n";
import { displayName } from "../lib/displayName";
import { formatDay } from "../lib/format";
import { useOnline } from "../lib/useOnline";
import { useSharedWishes } from "../lib/useSharedWishes";
import { useCreateRequest } from "../lib/useTabNavigation";
import { jarLevel, wishErrorKey } from "../lib/wishes";
import type { SessionProps } from "./SignedInShell";

const ComposeSheet = lazy(() => import("../components/bisou/ComposeSheet").then((m) => ({ default: m.ComposeSheet })));
const WishSheet = lazy(() => import("../components/bisou/WishSheet").then((m) => ({ default: m.WishSheet })));

/** The couple's shared jar ("Hai đứa"): one list both partners add to, change and delete from. */
export function SharedWishes({
  couple,
  user,
  onSignedOut,
  shared,
}: Pick<SessionProps, "user" | "onSignedOut"> & {
  couple: Couple;
  /** The shared list, loaded by the tab so its pull to refresh reloads it too. */
  shared: ReturnType<typeof useSharedWishes>;
}) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const deleteWish = useApiMutation(api.deleteSharedWish, ["shared-wishes"]);
  const { jar, setJar, failed, refresh } = shared;
  const people = useMemo(() => toPeople(couple.members, user, t), [couple.members, user, t]);
  const who = (id: string) => {
    const index = couple.members.findIndex((member) => member.id === id);
    return index < 0 ? undefined : people[index];
  };
  const partnerName = displayName(
    couple.members.find((m) => m.id !== user.id),
    t,
  );
  const openCount = jar?.open.length ?? 0;
  const doneCount = jar?.done.length ?? 0;
  // "5 điều ước · 2 đã làm": the done part only when something is done.
  const countLine = [
    t(openCount === 1 ? "sharedWish.countOpenOne" : "sharedWish.countOpen", { n: openCount }),
    ...(doneCount ? [t("sharedWish.countDone", { n: doneCount })] : []),
  ].join(" · ");
  const [doing, setDoing] = useState<SharedWish | null>(null);
  const [celebrate, setCelebrate] = useState(false);
  const [editing, setEditing] = useState<SharedWish | null | undefined>(undefined);
  const [fromMenu, setFromMenu] = useState(false);
  const [acting, setActing] = useState<SharedWish | null>(null);
  const [detail, setDetail] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The acted-on wish is gone (deleted on the other phone): close its sheet.
  if (acting && jar && ![...jar.open, ...jar.done].some((wish) => wish.id === acting.id)) setActing(null);
  // The options sheet still shows its wish while it animates closed.
  const [lastActing, setLastActing] = useState(acting);
  if (acting && acting !== lastActing) setLastActing(acting);
  const shown = acting ?? lastActing;
  useCreateRequest("wishes", () => {
    setFromMenu(true);
    setEditing(null);
  });

  const add = () => {
    setFromMenu(false);
    setEditing(null);
  };
  const open = (wish: SharedWish, asDetail: boolean) => {
    setDetail(asDetail);
    setActing(wish);
    setDeleting(false);
    setError(null);
  };

  async function remove() {
    if (!online || !acting || busy) return;
    setBusy(true);
    const res = await deleteWish(acting.id);
    setBusy(false);
    if (res.ok) {
      setJar(
        (j) => j && { open: j.open.filter((w) => w.id !== acting.id), done: j.done.filter((w) => w.id !== acting.id) },
      );
      setActing(null);
      toast.success(t("wish.deleted"));
    } else if (res.status === 401) onSignedOut();
    else setError(t(wishErrorKey(res.error?.error)));
  }

  const doneNote = (wish: SharedWish) => (
    <>
      {wish.doneOn && (
        <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
          <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check className="size-3" strokeWidth={3} aria-hidden="true" />
          </span>
          {t("sharedWish.doneOn", { date: formatDay(wish.doneOn, locale) })}
        </p>
      )}
      {wish.note && <p className="mt-1 text-sm whitespace-pre-line">{wish.note}</p>}
    </>
  );

  const card = (wish: SharedWish) => {
    const creator = who(wish.creatorId);
    return (
      <WishCard
        key={wish.id}
        wish={wish}
        onOpen={() => open(wish, true)}
        actions={
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("wish.options", { title: wish.title })}
            onClick={() => open(wish, false)}
          >
            <Ellipsis aria-hidden="true" />
          </Button>
        }
      >
        {creator && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <PersonAvatar person={creator} size="sm" className="size-5 text-xs" />
            {t("sharedWish.addedBy", { name: creator.name })}
          </p>
        )}
        {wish.status === "done" && doneNote(wish)}
      </WishCard>
    );
  };

  return (
    <>
      {jar && people[0] && people[1] && (
        <section aria-label={t("sharedWish.jarTitle")} className="mb-4 flex flex-col items-center gap-1">
          <WishJar
            people={[people[0], people[1]]}
            title={t("sharedWish.jarTitle")}
            label={`${t("sharedWish.jarTitle")}: ${countLine}`}
            level={jarLevel(jar.open.length)}
          />
          <p className="text-sm font-semibold tabular-nums">{countLine}</p>
        </section>
      )}
      <p className="mb-4 text-sm text-muted-foreground">{t("sharedWish.intro")}</p>
      {failed && (
        <div role="alert" className="mb-4 text-destructive">
          {t("sharedWish.loadError")}{" "}
          <Button variant="outline" onClick={() => void refresh()}>
            {t("journal.retry")}
          </Button>
        </div>
      )}
      {!jar && !failed && (
        <div aria-busy="true" aria-label={t("loading")} className="flex flex-col gap-3">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      )}
      {jar &&
        (jar.open.length === 0 ? (
          <EmptyState title={t("sharedWish.empty")} action={{ label: t("wishes.add"), onClick: add, icon: Plus }} />
        ) : (
          <div className="flex flex-col gap-3 pb-6">{jar.open.map(card)}</div>
        ))}
      {jar && jar.done.length > 0 && (
        <section aria-labelledby="shared-wish-done" className="pb-6">
          <h2 id="shared-wish-done" className="mb-3 font-heading text-xl">
            {t("sharedWish.doneList")}
          </h2>
          <div className="flex flex-col gap-3">{jar.done.map(card)}</div>
        </section>
      )}
      {doing && (
        <Suspense fallback={null}>
          <ComposeSheet
            open
            doneTogether={doing}
            partnerName={partnerName}
            onOpenChange={(next) => {
              if (!next) setDoing(null);
            }}
            onSignedOut={onSignedOut}
            onSaved={(entry) => {
              setJar(
                (j) =>
                  j && {
                    open: j.open.filter((w) => w.id !== doing.id),
                    done: [
                      { ...doing, status: "done", doneOn: entry.date, note: null, updatedAt: entry.updatedAt },
                      ...j.done,
                    ],
                  },
              );
              setCelebrate(true);
              void refresh();
            }}
          />
        </Suspense>
      )}
      <Celebration open={celebrate} onOpenChange={setCelebrate} />
      {editing !== undefined && (
        <Suspense fallback={null}>
          <WishSheet
            shared
            fromMenu={fromMenu}
            key={editing?.id ?? "new"}
            wish={editing}
            onClose={() => setEditing(undefined)}
            onSignedOut={onSignedOut}
            onSaved={(wish) => {
              setJar(
                (j) =>
                  j && {
                    ...j,
                    open: [wish, ...j.open.filter((w) => w.id !== wish.id)].sort(
                      (a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id),
                    ),
                  },
              );
              toast.success(t("wish.saved"));
            }}
          />
        </Suspense>
      )}
      <Drawer
        open={!!acting}
        onOpenChange={(next) => {
          if (!next && !busy) setActing(null);
        }}
      >
        <DrawerContent className="max-h-[80vh]" aria-describedby={undefined}>
          <div className="mx-auto flex min-h-0 w-full max-w-md flex-1 flex-col gap-2 px-5 pb-5">
            <DrawerHeader className="px-0 text-left">
              <DrawerTitle className="font-heading text-xl">{shown?.title}</DrawerTitle>
              {deleting && (
                <p id="shared-wish-delete-confirm" className="text-sm text-muted-foreground">
                  {t("sharedWish.deleteConfirm", { title: shown?.title ?? "" })}
                </p>
              )}
            </DrawerHeader>
            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {detail && shown && !deleting && <WishDetailSheet wish={shown} addedBy={who(shown.creatorId)?.name} />}
              <p role="alert" className="text-destructive empty:hidden">
                {error}
              </p>
              {!online && (
                <p id="shared-wish-offline" className="text-sm text-muted-foreground">
                  {t("offline.save")}
                </p>
              )}
              {deleting ? (
                <>
                  <Button
                    key="confirm-delete"
                    autoFocus
                    aria-describedby={
                      !online ? "shared-wish-delete-confirm shared-wish-offline" : "shared-wish-delete-confirm"
                    }
                    variant="destructive"
                    size="lg"
                    disabled={!online}
                    loading={busy}
                    onClick={() => void remove()}
                  >
                    <Trash2 aria-hidden="true" />
                    {t("wish.delete")}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    disabled={busy}
                    onClick={() => {
                      setDeleting(false);
                      setError(null);
                    }}
                  >
                    {t("common.back")}
                  </Button>
                </>
              ) : (
                <>
                  {shown?.status === "open" && (
                    <Button
                      size="lg"
                      className="justify-start"
                      onClick={() => {
                        setDoing(acting);
                        setActing(null);
                      }}
                    >
                      <Check aria-hidden="true" />
                      {t("sharedWish.doneAction")}
                    </Button>
                  )}
                  {shown?.status === "open" && (
                    <Button
                      variant="outline"
                      size="lg"
                      className="justify-start"
                      onClick={() => {
                        setFromMenu(false);
                        setEditing(acting);
                        setActing(null);
                      }}
                    >
                      <PencilLine aria-hidden="true" />
                      {t("wish.edit")}
                    </Button>
                  )}
                  <Button
                    aria-describedby={!online ? "shared-wish-offline" : undefined}
                    variant="outline"
                    size="lg"
                    disabled={!online}
                    className="justify-start text-destructive"
                    onClick={() => setDeleting(true)}
                  >
                    <Trash2 aria-hidden="true" />
                    {t("wish.delete")}
                  </Button>
                </>
              )}
            </div>
            {!deleting && (
              <Button variant="ghost" size="lg" onClick={() => setActing(null)}>
                {t("common.close")}
              </Button>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
