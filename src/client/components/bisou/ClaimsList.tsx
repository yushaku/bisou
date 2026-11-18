import { useId } from "react";
import { Check, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import { queries } from "@/lib/queries";
import { useApiMutation, useServerQuery } from "@/lib/serverQuery";
import { toast } from "@/components/ui/ding-toaster";
import type { Claim } from "../../../shared/types";
import { api, photoUrl } from "@/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n";
import { formatVnd } from "@/lib/format";
import { useOnline } from "@/lib/useOnline";
import { EmptyState } from "./EmptyState";

export function ClaimsList({ onSignedOut }: { onSignedOut: () => void }) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const offlineId = useId();
  const { data, setData, failed, refresh } = useServerQuery(queries.claims, onSignedOut);
  const releaseClaim = useApiMutation(api.releaseClaim, ["claims", "wishes"]);
  const [notices, setNotices] = useState<Claim[]>([]);
  const claims = data ? [...notices.filter((c) => !data.claims.some((n) => n.id === c.id)), ...data.claims] : null;
  const [releasing, setReleasing] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    for (const claim of data?.claims ?? []) {
      if (claim.status !== "gone") continue;
      setNotices((old) => (old.some((n) => n.id === claim.id) ? old : [...old, claim]));
      void api.acknowledgeClaimNotice(claim.id).then((res) => {
        if (res.ok) setData((old) => old && { claims: old.claims.filter((n) => n.id !== claim.id) });
        else if (res.status === 401) onSignedOut();
      });
    }
  }, [data, setData, onSignedOut]);

  async function release() {
    if (!online || !releasing || busy) return;
    setBusy(true);
    const res = await releaseClaim(releasing.id);
    setBusy(false);
    if (res.ok) {
      setData((old) => old && { claims: old.claims.filter((c) => c.id !== releasing.id) });
      setReleasing(null);
      toast.success(t("claims.released"));
    } else if (res.status === 401) onSignedOut();
    else {
      setError(t(res.error?.error === "wish_received" ? "wish.alreadyReceived" : "error.generic"));
      void refresh();
    }
  }

  return (
    <>
      {!online && (
        <p id={`${offlineId}-1`} className="text-sm text-muted-foreground">
          {t("offline.save")}
        </p>
      )}
      {failed && (
        <p role="alert" className="text-destructive">
          {t("claims.loadError")}{" "}
          <Button variant="outline" onClick={() => void refresh()}>
            {t("journal.retry")}
          </Button>
        </p>
      )}
      {!claims && !failed && <Skeleton className="h-28" aria-label={t("loading")} />}
      {claims?.length === 0 && <EmptyState title={t("claims.empty")} />}
      <div className="flex flex-col gap-3">
        {claims?.map((claim) => (
          <Card key={claim.id} className="gap-3 p-4">
            {claim.status === "gone" ? (
              <>
                <p>{t("claims.gone", { title: claim.title })}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNotices((old) => old.filter((c) => c.id !== claim.id));
                    setData((old) => old && { claims: old.claims.filter((c) => c.id !== claim.id) });
                  }}
                >
                  {t("claims.dismiss")}
                </Button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  {claim.photoId && (
                    <img
                      src={photoUrl(claim.photoId, "thumb")}
                      alt={claim.title}
                      loading="lazy"
                      className="size-20 rounded-lg object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold">{claim.title}</h2>
                    {claim.price !== null && <p className="font-heading text-lg">{formatVnd(claim.price, locale)}</p>}
                  </div>
                  {claim.link && (
                    <Button asChild variant="ghost" size="icon">
                      <a href={claim.link} target="_blank" rel="noreferrer noopener" aria-label={t("wish.openLink")}>
                        <ExternalLink aria-hidden="true" />
                      </a>
                    </Button>
                  )}
                  {claim.status === "received" && (
                    <span className="flex size-11 shrink-0 items-center justify-center">
                      <span className="flex size-9 items-center justify-center rounded-full bg-success text-success-foreground elevate-sm motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300">
                        <Check className="size-5" strokeWidth={3} aria-hidden="true" />
                      </span>
                      <span className="sr-only">{t("claims.received")}</span>
                    </span>
                  )}
                </div>
                {claim.status !== "received" && (
                  <Button
                    variant="outline"
                    aria-describedby={!online ? `${offlineId}-1` : undefined}
                    disabled={!online}
                    onClick={() => {
                      setReleasing(claim);
                      setError(null);
                    }}
                  >
                    {t("claims.release")}
                  </Button>
                )}
              </>
            )}
          </Card>
        ))}
      </div>
      <Dialog
        open={!!releasing}
        onOpenChange={(open) => {
          if (!open && !busy) setReleasing(null);
        }}
      >
        <DialogContent showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>{t("claims.release")}</DialogTitle>
            <DialogDescription>{t("claims.releaseConfirm", { title: releasing?.title ?? "" })}</DialogDescription>
          </DialogHeader>
          <p role="alert" className="text-destructive empty:hidden">
            {error}
          </p>
          {!online && (
            <p id={`${offlineId}-2`} className="text-sm text-muted-foreground">
              {t("offline.save")}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setReleasing(null)}>
              {t("common.close")}
            </Button>
            <Button
              aria-describedby={!online ? `${offlineId}-2` : undefined}
              disabled={!online}
              loading={busy}
              onClick={() => void release()}
            >
              {t("claims.release")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
