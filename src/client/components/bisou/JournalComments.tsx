import { useQueryClient } from "@tanstack/react-query";
import { EllipsisVertical, PencilLine, Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
  type SubmitEvent,
} from "react";
import { COMMENT_TEXT_MAX } from "../../../shared/journal";
import type { JournalComment } from "../../../shared/types";
import { api } from "@/api";
import { useI18n } from "@/i18n";
import { ApiQueryError } from "@/lib/apiQueryError";
import { formatDay, formatTime } from "@/lib/format";
import { queries } from "@/lib/queries";
import { useApiMutation, useServerQuery } from "@/lib/serverQuery";
import { useOnline } from "@/lib/useOnline";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DrawerNested, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PersonAvatar, type Person } from "./CoupleAvatars";
import { EmptyState } from "./EmptyState";

function reveal(scroller: HTMLElement, row: HTMLElement, alignStart = false) {
  const viewport = scroller.getBoundingClientRect();
  const bounds = row.getBoundingClientRect();
  const delta =
    alignStart || bounds.top < viewport.top || bounds.height > scroller.clientHeight
      ? bounds.top - viewport.top
      : Math.max(0, bounds.bottom - viewport.bottom);
  scroller.scrollTop += delta;
}

export function JournalComments({
  entryId,
  userId,
  people,
  jumpToThread = false,
  onSignedOut,
  children,
}: {
  entryId: string;
  userId: string;
  people: ReadonlyMap<string, Person>;
  jumpToThread?: boolean;
  onSignedOut: () => void;
  children?: ReactNode;
}) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const client = useQueryClient();
  const options = useMemo(() => queries.journalComments(entryId), [entryId]);
  const { data, error, failed, refresh } = useServerQuery(options, onSignedOut);
  const missingEntry = error instanceof ApiQueryError && error.status === 404;
  const comments = missingEntry ? undefined : data?.comments;

  useEffect(() => {
    if (!comments) return;
    const queryKey = queries.journal.queryKey;
    const entry = client
      .getQueryData(queryKey)
      ?.pages.flatMap((page) => page.entries)
      .find((entry) => entry.id === entryId);
    if (entry && (entry.commentCount ?? 0) !== comments.length) {
      void client.invalidateQueries({ queryKey, exact: true }, { cancelRefetch: false });
    }
  }, [client, comments, entryId]);

  const createComment = useApiMutation(api.createJournalComment, ["journal"]);
  const editComment = useApiMutation(api.editJournalComment, ["journal"]);
  const deleteComment = useApiMutation(api.deleteJournalComment, ["journal"]);
  const titleId = useId();
  const feedbackId = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const confirmCancel = useRef<HTMLButtonElement>(null);
  const actionFirst = useRef<HTMLButtonElement>(null);
  const editFocus = useRef(false);
  const confirmFocus = useRef(false);
  const jumped = useRef(false);
  const revealed = useRef<string | null>(null);
  const press = useRef<{ timer: number; pointer: number; x: number; y: number } | null>(null);

  const [draft, setDraft] = useState("");
  const [edit, setEdit] = useState<{ id: string; text: string } | null>(null);
  const [action, setAction] = useState<JournalComment | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [sentId, setSentId] = useState<string | null>(null);
  const [announce, setAnnounce] = useState(false);

  const value = edit?.text ?? draft;
  const text = value.trim();
  const used = Array.from(text).length;
  const tooLong = used > COMMENT_TEXT_MAX;

  const cancelPress = useCallback(() => {
    if (!press.current) return;
    window.clearTimeout(press.current.timer);
    press.current = null;
  }, []);
  useEffect(() => {
    const cancelAdditionalTouch = (event: globalThis.PointerEvent) => {
      if (event.pointerType === "touch" && !event.isPrimary) cancelPress();
    };
    window.addEventListener("pointerdown", cancelAdditionalTouch, true);
    return () => {
      window.removeEventListener("pointerdown", cancelAdditionalTouch, true);
      cancelPress();
    };
  }, [cancelPress]);

  useLayoutEffect(() => {
    if (jumpToThread && !jumped.current && (data || failed) && scroller.current && heading.current) {
      jumped.current = true;
      reveal(scroller.current, heading.current, true);
    }
  }, [data, failed, jumpToThread]);

  useLayoutEffect(() => {
    if (!sentId || revealed.current === sentId || !comments || !scroller.current) return;
    const row = document.getElementById(`${titleId}-${sentId}`);
    if (row) {
      revealed.current = sentId;
      reveal(scroller.current, row);
    }
  }, [sentId, comments, titleId]);

  function focusRow() {
    const target = returnFocus.current;
    if (target?.isConnected) target.focus({ preventScroll: true });
    else heading.current?.focus({ preventScroll: true });
  }

  function openActions(comment: JournalComment, button: HTMLButtonElement | null) {
    if (saving || comment.authorId !== userId) return;
    returnFocus.current = button;
    setAction(comment);
  }

  function startPress(event: PointerEvent<HTMLDivElement>, comment: JournalComment) {
    if (event.pointerType !== "touch" || !event.isPrimary || saving) return;
    cancelPress();
    const button = event.currentTarget.querySelector<HTMLButtonElement>("[data-comment-options]");
    if (event.target instanceof Node && button?.contains(event.target)) return;
    press.current = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      timer: window.setTimeout(() => {
        press.current = null;
        openActions(comment, button ?? null);
      }, 500),
    };
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online || missingEntry || !text || tooLong || saving) return;
    setSaving(true);
    setSaveError(false);
    setAnnounce(false);
    setSentId(null);
    if (edit) {
      const result = await editComment(entryId, edit.id, text);
      if (result.ok) setEdit(null);
      else if (result.status === 401) onSignedOut();
      else setSaveError(true);
    } else {
      const result = await createComment(entryId, text);
      if (result.ok) {
        const { comment } = result.data;
        setDraft("");
        setSentId(comment.id);
        setAnnounce(true);
      } else if (result.status === 401) onSignedOut();
      else setSaveError(true);
    }
    setSaving(false);
  }

  function startEdit(comment: JournalComment) {
    editFocus.current = true;
    setEdit({ id: comment.id, text: comment.text });
    setSaveError(false);
    setAction(null);
    input.current?.focus({ preventScroll: true });
    const row = document.getElementById(`${titleId}-${comment.id}`);
    if (row && scroller.current) reveal(scroller.current, row);
  }

  async function remove() {
    if (!deleteId || !online || deleting) return;
    setDeleting(true);
    setDeleteError(false);
    const result = await deleteComment(entryId, deleteId);
    setDeleting(false);
    if (result.ok) {
      const target = returnFocus.current;
      if (target) {
        returnFocus.current =
          Array.from(scroller.current?.querySelectorAll<HTMLButtonElement>("[data-comment-options]") ?? []).find(
            (button) => button !== target,
          ) ?? null;
      }
      if (edit?.id === deleteId) {
        setEdit(null);
        setSaveError(false);
      }
      setDeleteId(null);
    } else if (result.status === 401) onSignedOut();
    else setDeleteError(true);
  }

  const feedback = !online
    ? t("comments.offline")
    : saveError
      ? t(edit ? "comments.saveError" : "comments.sendError")
      : null;

  return (
    <>
      <div
        ref={scroller}
        onScroll={cancelPress}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4"
      >
        {children}
        <section aria-labelledby={titleId} className="flex flex-col gap-3 border-t border-border pt-4">
          <h3 id={titleId} ref={heading} tabIndex={-1} className="font-heading text-xl outline-none">
            {t("comments.title")}
          </h3>
          {failed &&
            (comments ? (
              <div role="status" className="flex items-center gap-3 text-sm text-muted-foreground">
                {t("comments.loadError")}
                <Button variant="link" className="min-h-11" onClick={() => void refresh()}>
                  {t("journal.retry")}
                </Button>
              </div>
            ) : (
              <EmptyState
                situation="error"
                title={t(missingEntry ? "comments.entryMissing" : "comments.loadError")}
                action={missingEntry ? undefined : { label: t("journal.retry"), onClick: () => void refresh() }}
              />
            ))}
          {!data && !failed && <Skeleton role="status" aria-label={t("comments.loading")} className="h-14 w-full" />}
          {comments?.length === 0 && <p className="text-sm text-muted-foreground">{t("comments.empty")}</p>}
          {!!comments?.length && (
            <ol className="flex flex-col gap-3">
              {comments.map((comment) => {
                const own = comment.authorId === userId;
                const person = people.get(comment.authorId);
                const name = comment.authorName || person?.name || t("common.person");
                return (
                  <li key={comment.id} id={`${titleId}-${comment.id}`} className="flex items-start gap-2">
                    <span aria-hidden="true">
                      <PersonAvatar person={person ?? { name, tone: "secondary" }} size="sm" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn(
                          "relative w-fit max-w-full rounded-xl bg-muted px-3 py-2 text-foreground",
                          own && "pr-11",
                        )}
                        data-vaul-no-drag={own ? "" : undefined}
                        onPointerDown={own ? (event) => startPress(event, comment) : undefined}
                        onPointerMove={
                          own
                            ? (event) => {
                                const pending = press.current;
                                if (
                                  pending?.pointer === event.pointerId &&
                                  Math.hypot(event.clientX - pending.x, event.clientY - pending.y) > 10
                                )
                                  cancelPress();
                              }
                            : undefined
                        }
                        onPointerCancel={own ? cancelPress : undefined}
                        onPointerUp={own ? cancelPress : undefined}
                        onPointerLeave={own ? cancelPress : undefined}
                        onContextMenu={
                          own
                            ? (event) => {
                                if (press.current || action?.id === comment.id) event.preventDefault();
                              }
                            : undefined
                        }
                      >
                        <p className="font-semibold wrap-anywhere">{name}</p>
                        <p className="text-base wrap-anywhere whitespace-pre-wrap">{comment.text}</p>
                        {own && (
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="absolute -top-1 -right-1 text-muted-foreground"
                            data-comment-options
                            data-vaul-no-drag
                            aria-label={t("comments.options")}
                            aria-haspopup="dialog"
                            disabled={saving}
                            onClick={(event) => openActions(comment, event.currentTarget)}
                          >
                            <EllipsisVertical aria-hidden="true" />
                          </Button>
                        )}
                      </div>
                      <time
                        dateTime={new Date(comment.createdAt).toISOString()}
                        className="mt-0.5 block px-3 text-xs text-muted-foreground tabular-nums"
                      >
                        {t("comments.writtenAt", {
                          date: formatDay(new Date(comment.createdAt), locale, "short"),
                          time: formatTime(comment.createdAt, locale),
                        })}
                      </time>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <form
        onSubmit={(event) => void save(event)}
        data-vaul-no-drag
        className="shrink-0 border-t border-border bg-popover px-5 py-2"
      >
        {edit && (
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold">{t("comments.editing")}</p>
            <Button
              variant="ghost"
              type="button"
              disabled={saving}
              onClick={() => {
                setEdit(null);
                setSaveError(false);
                focusRow();
              }}
            >
              {t("comments.cancel")}
            </Button>
          </div>
        )}
        <div id={feedbackId} className="flex items-baseline justify-between gap-2 text-sm empty:hidden">
          {feedback && (
            <p
              role={saveError ? "alert" : "status"}
              className={saveError ? "text-destructive" : "text-muted-foreground"}
            >
              {feedback}
            </p>
          )}
          {tooLong && (
            <p role="alert" className="text-destructive">
              {t("comments.tooLong", { max: COMMENT_TEXT_MAX })}
            </p>
          )}
          {used >= COMMENT_TEXT_MAX * 0.9 && (
            <p className="ml-auto shrink-0 text-muted-foreground tabular-nums" aria-hidden="true">
              {t("comments.counter", { used, max: COMMENT_TEXT_MAX })}
            </p>
          )}
        </div>
        <div className="flex items-end gap-2">
          <Textarea
            ref={input}
            rows={1}
            className="max-h-28 min-h-11 min-w-0 flex-1 resize-none group-data-[keyboard=open]/journal-detail:max-h-20"
            aria-label={t(edit ? "comments.editing" : "comments.add")}
            placeholder={t("comments.add")}
            value={value}
            readOnly={saving}
            aria-invalid={tooLong || undefined}
            aria-describedby={feedbackId}
            onChange={(event) => {
              const next = event.target.value;
              if (edit) setEdit({ ...edit, text: next });
              else setDraft(next);
              setSentId(null);
              setAnnounce(false);
              setSaveError(false);
            }}
            onFocus={() => {
              if (edit || editFocus.current || !comments?.length || !scroller.current || !heading.current) return;
              const list = scroller.current;
              if (heading.current.getBoundingClientRect().top > list.getBoundingClientRect().bottom) {
                list.scrollTop = list.scrollHeight;
              }
            }}
          />
          <Button
            type="submit"
            className="w-24 px-2"
            loading={saving}
            disabled={!online || missingEntry || !text || tooLong}
            aria-label={saving && !edit ? t("comments.sending") : undefined}
            onPointerDown={(event) => {
              if (document.activeElement === input.current) event.preventDefault();
            }}
          >
            {t(edit ? "comments.save" : "comments.send")}
          </Button>
        </div>
        <p role="status" className="sr-only">
          {announce ? t("comments.sent") : ""}
        </p>
      </form>

      <DrawerNested open={!!action} onOpenChange={(open) => !open && setAction(null)}>
        <DrawerContent
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            actionFirst.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (!scroller.current?.isConnected || confirmFocus.current) return;
            if (editFocus.current) {
              editFocus.current = false;
              if (document.activeElement !== input.current) input.current?.focus({ preventScroll: true });
            } else focusRow();
          }}
        >
          <DrawerTitle className="sr-only">{t("comments.options")}</DrawerTitle>
          <div className="mx-auto flex w-full max-w-md flex-col gap-2 px-5 py-4">
            <Button ref={actionFirst} variant="outline" onClick={() => action && startEdit(action)}>
              <PencilLine aria-hidden="true" />
              {t("comments.editAction")}
            </Button>
            <Button
              variant="destructive"
              disabled={!online}
              onClick={() => {
                confirmFocus.current = true;
                setDeleteError(false);
                setDeleteId(action?.id ?? null);
                setAction(null);
              }}
            >
              <Trash2 aria-hidden="true" />
              {t("comments.deleteAction")}
            </Button>
            <Button variant="ghost" onClick={() => setAction(null)}>
              {t("comments.cancel")}
            </Button>
          </div>
        </DrawerContent>
      </DrawerNested>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && !deleting && setDeleteId(null)}>
        <DialogContent
          showCloseButton={false}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            confirmCancel.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            confirmFocus.current = false;
            if (scroller.current?.isConnected) focusRow();
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{t("comments.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("comments.deleteBody")}</DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-destructive">
              {t("comments.deleteError")}
            </p>
          )}
          {!online && <p className="text-sm text-muted-foreground">{t("comments.offline")}</p>}
          <DialogFooter>
            <Button variant="destructive" loading={deleting} disabled={!online} onClick={() => void remove()}>
              {t("comments.deleteConfirm")}
            </Button>
            <Button ref={confirmCancel} disabled={deleting} onClick={() => setDeleteId(null)}>
              {t("comments.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
