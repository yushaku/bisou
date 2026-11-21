import { useQueryClient } from "@tanstack/react-query";
import { PencilLine, Trash2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type SubmitEvent } from "react";
import { COMMENT_TEXT_MAX } from "../../../shared/journal";
import type { JournalComment } from "../../../shared/types";
import { api } from "@/api";
import { useI18n } from "@/i18n";
import { ApiQueryError } from "@/lib/apiQueryError";
import { formatDay, formatTime } from "@/lib/format";
import { queries } from "@/lib/queries";
import { useApiMutation, useServerQuery } from "@/lib/serverQuery";
import { useOnline } from "@/lib/useOnline";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "./EmptyState";

export function JournalComments({
  entryId,
  userId,
  onSignedOut,
}: {
  entryId: string;
  userId: string;
  onSignedOut: () => void;
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
  const inputId = useId();
  const feedbackId = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [editText, setEditText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const value = editingId ? editText : draft;
  const text = value.trim();
  const tooLong = Array.from(text).length > COMMENT_TEXT_MAX;

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!online || !text || tooLong || saving) return;
    setSaving(true);
    setSaveError(false);
    const result = editingId ? await editComment(entryId, editingId, text) : await createComment(entryId, text);
    setSaving(false);
    if (result.ok) {
      if (editingId) setEditingId(null);
      else setDraft("");
    } else if (result.status === 401) {
      onSignedOut();
    } else {
      setSaveError(true);
    }
  }

  function startEdit(comment: JournalComment) {
    setEditingId(comment.id);
    setEditText(comment.text);
    setSaveError(false);
    input.current?.focus();
  }

  async function remove() {
    if (!deleteId || !online || deleting) return;
    setDeleting(true);
    setDeleteError(false);
    const result = await deleteComment(entryId, deleteId);
    setDeleting(false);
    if (result.ok) {
      if (editingId === deleteId) {
        setEditingId(null);
        setSaveError(false);
      }
      setDeleteId(null);
    } else if (result.status === 401) {
      onSignedOut();
    } else {
      setDeleteError(true);
    }
  }

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 border-t pt-4">
      <h3 id={titleId} className="font-heading text-xl">
        {t("comments.title")}
      </h3>
      {failed && (
        <EmptyState
          situation="error"
          title={t(missingEntry ? "comments.entryMissing" : "comments.loadError")}
          action={missingEntry ? undefined : { label: t("journal.retry"), onClick: () => void refresh() }}
        />
      )}
      {!data && !failed && <Skeleton role="status" aria-label={t("comments.loading")} className="h-14 w-full" />}
      {comments?.length === 0 && <p className="text-sm text-muted-foreground">{t("comments.empty")}</p>}
      {comments && comments.length > 0 && (
        <ol className="flex flex-col gap-3">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-xl bg-card p-3">
              <div className="flex flex-wrap items-center justify-between gap-x-2">
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
                  <span className="font-semibold wrap-anywhere">{comment.authorName || t("common.person")}</span>
                  <time dateTime={new Date(comment.createdAt).toISOString()} className="text-sm text-muted-foreground">
                    {t("comments.writtenAt", {
                      date: formatDay(new Date(comment.createdAt), locale, "short"),
                      time: formatTime(comment.createdAt, locale),
                    })}
                  </time>
                </div>
                {comment.authorId === userId && (
                  <div className="flex">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      disabled={saving}
                      aria-label={t("comments.edit")}
                      onClick={() => startEdit(comment)}
                    >
                      <PencilLine aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive"
                      disabled={!online || saving}
                      aria-label={t("comments.delete")}
                      onClick={() => {
                        setDeleteError(false);
                        setDeleteId(comment.id);
                      }}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                )}
              </div>
              <p className="wrap-anywhere whitespace-pre-wrap">{comment.text}</p>
            </li>
          ))}
        </ol>
      )}

      <form onSubmit={(event) => void save(event)} className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-sm font-semibold">
          {t(editingId ? "comments.edit" : "comments.add")}
        </label>
        <Textarea
          id={inputId}
          ref={input}
          rows={2}
          className="max-h-32 min-h-11"
          value={value}
          readOnly={saving}
          aria-invalid={tooLong || undefined}
          aria-describedby={feedbackId}
          onChange={(event) => {
            if (editingId) setEditText(event.target.value);
            else setDraft(event.target.value);
            setSaveError(false);
          }}
        />
        <div id={feedbackId}>
          {!online && <p className="text-sm text-muted-foreground">{t("offline.save")}</p>}
          {(tooLong || saveError) && (
            <p role="alert" className="text-sm text-destructive">
              {tooLong ? t("comments.tooLong", { max: COMMENT_TEXT_MAX }) : t("comments.saveError")}
            </p>
          )}
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {editingId && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={saving}
              onClick={() => {
                setEditingId(null);
                setSaveError(false);
              }}
            >
              {t("entry.cancel")}
            </Button>
          )}
          <Button type="submit" size="lg" loading={saving} disabled={!online || missingEntry || !text || tooLong}>
            {t(editingId ? "comments.save" : "comments.send")}
          </Button>
        </div>
      </form>

      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && !deleting && setDeleteId(null)}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle className="font-heading text-xl">{t("comments.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("comments.deleteBody")}</DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p role="alert" className="text-destructive">
              {t("comments.deleteError")}
            </p>
          )}
          {!online && <p className="text-sm text-muted-foreground">{t("offline.save")}</p>}
          <DialogFooter>
            <Button variant="destructive" loading={deleting} disabled={!online} onClick={() => void remove()}>
              {t("comments.delete")}
            </Button>
            <Button autoFocus disabled={deleting} onClick={() => setDeleteId(null)}>
              {t("entry.cancel")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
