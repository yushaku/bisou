import { useId } from "react";
import { Check, ExternalLink } from "lucide-react";
import { useCallback, useContext, useEffect, useLayoutEffect, useState } from "react";
import { toast } from "@/components/ui/ding-toaster";
import type { Claim } from "../../../shared/types";
import { api, photoUrl } from "@/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/i18n";
import { formatVnd } from "@/lib/format";
import { TabMemory } from "@/lib/tabMemory";
import { useOnline } from "@/lib/useOnline";
import { EmptyState } from "./EmptyState";

export function ClaimsList({ onSignedOut }: { onSignedOut: () => void }) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const offlineId = useId();
  const memory = useContext(TabMemory);
  const [claims, setClaims] = useState<Claim[] | null>(() => memory?.claims ?? null);
  useLayoutEffect(() => {
    // Deletion notices are shown once, so they are not kept for the next visit.
    if (memory) memory.claims = claims && claims.filter((c) => c.status !== "gone");
  }, [claims, memory]);
  const [failed, setFailed] = useState(false);
  const [releasing, setReleasing] = useState<Claim | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const res = await api.claims();
    if (res.ok) {
      // A refresh must not hide a deletion notice before it can be read on this screen.
      setClaims((old) => [...(old ?? []).filter((c) => c.status === "gone" && !res.data.claims.some((n) => n.id === c.id)), ...res.data.claims]);
      setFailed(false);
    } else if (res.status === 401) onSignedOut();
    else setFailed(true);
  }, [onSignedOut]);
  useEffect(() => {
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => document.removeEventListener("visibilitychange", visible);
  }, [refresh]);
  useEffect(() => {
    for (const claim of claims ?? []) {
      if (claim.status === "gone") void api.acknowledgeClaimNotice(claim.id);
    }
  }, [claims]);

  async function release() {
    if (!online || !releasing || busy) return;
    setBusy(true);
    const res = await api.releaseClaim(releasing.id);
    setBusy(false);
    if (res.ok) { setClaims((cs) => cs?.filter((c) => c.id !== releasing.id) ?? null); setReleasing(null); toast.success(t("claims.released")); }
    else if (res.status === 401) onSignedOut();
    else { setError(t(res.error?.error === "wish_received" ? "wish.alreadyReceived" : "error.generic")); void refresh(); }
  }

  return <>
    {!online && <p id={`${offlineId}-1`} className="text-sm text-muted-foreground">{t("offline.save")}</p>}
    {failed && <p role="alert" className="text-destructive">{t("claims.loadError")} <Button variant="outline" onClick={() => void refresh()}>{t("journal.retry")}</Button></p>}
    {!claims && !failed && <Skeleton className="h-28" aria-label={t("loading")} />}
    {claims?.length === 0 && <EmptyState title={t("claims.empty")} />}
    <div className="flex flex-col gap-3">{claims?.map((claim) => <Card key={claim.id} className="gap-3 p-4">
      {claim.status === "gone" ? <><p>{t("claims.gone", { title: claim.title })}</p><Button variant="outline" onClick={() => setClaims((cs) => cs?.filter((c) => c.id !== claim.id) ?? null)}>{t("claims.dismiss")}</Button></> : <>
        <div className="flex items-center gap-3">
          {claim.photoId && <img src={photoUrl(claim.photoId, "thumb")} alt={claim.title} loading="lazy" className="size-20 rounded-lg object-cover" />}
          <div className="min-w-0 flex-1"><h2 className="font-semibold">{claim.title}</h2>{claim.price !== null && <p className="font-heading text-lg">{formatVnd(claim.price, locale)}</p>}</div>
          {claim.link && <Button asChild variant="ghost" size="icon"><a href={claim.link} target="_blank" rel="noreferrer noopener" aria-label={t("wish.openLink")}><ExternalLink aria-hidden="true" /></a></Button>}
          {claim.status === "received" && <span className="flex size-11 shrink-0 items-center justify-center">
            <span className="flex size-9 items-center justify-center rounded-full bg-success text-success-foreground elevate-sm motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-300">
              <Check className="size-5" strokeWidth={3} aria-hidden="true" />
            </span>
            <span className="sr-only">{t("claims.received")}</span>
          </span>}
        </div>
        {claim.status !== "received" && <Button variant="outline" aria-describedby={!online ? `${offlineId}-1` : undefined} disabled={!online} onClick={() => { setReleasing(claim); setError(null); }}>{t("claims.release")}</Button>}
      </>}
    </Card>)}</div>
    <Dialog open={!!releasing} onOpenChange={(open) => { if (!open && !busy) setReleasing(null); }}>
      <DialogContent showCloseButton={!busy}><DialogHeader><DialogTitle>{t("claims.release")}</DialogTitle><DialogDescription>{t("claims.releaseConfirm", { title: releasing?.title ?? "" })}</DialogDescription></DialogHeader>
        <p role="alert" className="text-destructive empty:hidden">{error}</p>
        {!online && <p id={`${offlineId}-2`} className="text-sm text-muted-foreground">{t("offline.save")}</p>}
        <DialogFooter><Button variant="outline" disabled={busy} onClick={() => setReleasing(null)}>{t("common.close")}</Button><Button aria-describedby={!online ? `${offlineId}-2` : undefined} disabled={!online} loading={busy} onClick={() => void release()}>{t("claims.release")}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
