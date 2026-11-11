import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "@/components/ui/ding-toaster";
import { api } from "@/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { isStandalone } from "@/lib/install";
import { permissionPromptHidden, pushSupport, turnOn } from "@/lib/push";
import { useOnline } from "@/lib/useOnline";

const DISMISSED = "bisou.push.card";

export function NotificationCard() {
  const { t } = useI18n();
  const online = useOnline();
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED) !== null; } catch { return false; }
  });
  const [ready, setReady] = useState<{ registration: ServiceWorkerRegistration; publicKey: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const eligible = isStandalone() && pushSupport() === "ok" && Notification.permission === "default";

  useEffect(() => {
    if (!eligible || dismissed) return;
    let active = true;
    void (async () => {
      try {
        const [registration, res] = await Promise.all([navigator.serviceWorker.getRegistration(), api.push()]);
        const subscription = registration?.pushManager ? await registration.pushManager.getSubscription() : null;
        if (active) setReady(registration?.pushManager && !subscription && res.ok && res.data.publicKey
          ? { registration, publicKey: res.data.publicKey } : null);
      } catch { if (active) setReady(null); }
    })();
    return () => { active = false; };
  }, [eligible, dismissed, online]);

  if (!eligible || dismissed || !ready) return null;

  function dismiss() {
    document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
    setDismissed(true);
    try { localStorage.setItem(DISMISSED, "1"); } catch { /* The dismissal still lasts for this visit. */ }
  }

  async function enable() {
    if (!ready || !online || busy) return;
    setBusy(true);
    try {
      await turnOn(ready.registration, ready.publicKey, { journal: true, reminders: true });
    } catch (e) {
      if (Notification.permission !== "denied") toast.error(t(permissionPromptHidden(e) ? "push.askHidden" : "error.generic"));
    } finally { dismiss(); setBusy(false); }
  }

  return <Card className="relative mt-5 mb-5 gap-3 p-4">
    <h2 className="pr-10 font-heading text-xl">{t("push.card.title")}</h2>
    <Button variant="ghost" size="icon" className="absolute top-2 right-2" disabled={busy} aria-label={t("push.card.dismiss")} onClick={dismiss}><X aria-hidden="true" /></Button>
    <p className="text-sm text-muted-foreground">{t("push.card.body")}</p>
    {!online && <p id="push-card-offline" className="text-sm text-muted-foreground">{t("offline.save")}</p>}
    <Button loading={busy} disabled={!online} aria-describedby={!online ? "push-card-offline" : undefined} onClick={enable}>{t("push.card.button")}</Button>
  </Card>;
}
