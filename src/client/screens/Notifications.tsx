import { useEffect, useRef, useState } from "react";
import type { PushDevice, PushSubscriptionInput } from "../../shared/types";
import { api } from "../api";
import { SubPageHeader } from "../components/bisou/SubPageHeader";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { useI18n } from "../i18n";
import { permissionPromptHidden, pushSupport, turnOff, turnOn } from "../lib/push";
import { useOnline } from "../lib/useOnline";

export function Notifications({ onSignedOut }: { onSignedOut: () => void }) {
  const { t } = useI18n();
  const online = useOnline();
  const support = pushSupport();
  const [registration, setRegistration] = useState<ServiceWorkerRegistration>();
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [device, setDevice] = useState<PushDevice | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const changing = useRef(false);
  const revision = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<false | "error.generic" | "push.askHidden">(false);
  const [permission, setPermission] = useState(() => typeof Notification === "undefined" ? "default" : Notification.permission);

  useEffect(() => {
    let active = true;
    async function load() {
      if (changing.current) return;
      const version = revision.current;
      try {
        const [reg, res] = await Promise.all([
          support === "ok" ? navigator.serviceWorker.getRegistration() : undefined, api.push(),
        ]);
        const sub = reg?.pushManager ? await reg.pushManager.getSubscription() : null;
        if (!active || changing.current || version !== revision.current) return;
        setRegistration(reg); setSubscription(sub);
        setPermission(typeof Notification === "undefined" ? "default" : Notification.permission);
        if (res.ok) {
          setPublicKey(res.data.publicKey);
          setDevice(res.data.devices.find((d) => d.endpoint === sub?.endpoint) ?? null);
          setError(false);
        } else if (res.status === 401) onSignedOut();
        else setError("error.generic");
      } catch { if (active && version === revision.current) setError("error.generic"); }
      finally { if (active && version === revision.current) setLoaded(true); }
    }
    void load();
    const visible = () => { if (document.visibilityState === "visible") void load(); };
    document.addEventListener("visibilitychange", visible);
    return () => { active = false; document.removeEventListener("visibilitychange", visible); };
  }, [support, online, onSignedOut]);

  const state = !loaded ? "loading" : support === "needsInstall" ? "push.needsInstall"
    : support === "unsupported" || !registration?.pushManager ? "push.unsupported"
    : permission === "denied" ? "push.blocked" : !publicKey ? "push.unavailable"
    : device && subscription ? "push.on" : "push.off";
  const disabled = !loaded || busy || !online || !registration?.pushManager || !publicKey || permission === "denied";

  async function change(kind: "journal" | "reminders", value: boolean) {
    if (disabled || changing.current || !registration || !publicKey) return;
    const kinds = { journal: device?.journal ?? false, reminders: device?.reminders ?? false, [kind]: value };
    changing.current = true; revision.current++;
    setBusy(true); setError(false);
    try {
      if (!kinds.journal && !kinds.reminders) {
        await turnOff(); setSubscription(null); setDevice(null);
      } else if (!subscription || !device) {
        const result = await turnOn(registration, publicKey, kinds, subscription);
        setSubscription(result.subscription); setDevice(result.device);
      } else {
        const res = await api.savePush({ ...subscription.toJSON(), ...kinds } as PushSubscriptionInput);
        if (!res.ok) throw new Error("push save failed");
        setDevice(res.data.device);
      }
    } catch (e) { setError(permissionPromptHidden(e) ? "push.askHidden" : "error.generic"); }
    finally { changing.current = false; setPermission(Notification.permission); setBusy(false); }
  }

  return <div className="flex min-h-dvh flex-col">
    <SubPageHeader title={t("push.title")} />
    <p id="push-offline" role="status" className="sticky top-[calc(env(safe-area-inset-top)+--spacing(14))] z-30 bg-warning px-4 py-3 text-center text-sm text-warning-foreground empty:py-0">{!online ? t("offline.bar") : ""}</p>
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pt-3 pb-[max(--spacing(6),env(safe-area-inset-bottom))]">
      <p id="push-state" role="status" className="text-sm text-muted-foreground">{t(state)}</p>
      <div className="divide-y divide-border overflow-hidden rounded-xl edge bg-card text-card-foreground" aria-busy={busy}>
        {(["journal", "reminders"] as const).map((kind) => <Label htmlFor={`push-${kind}`} key={kind} className="flex min-h-14 cursor-pointer items-center gap-4 px-4 py-3">
          <span className="flex-1 py-2 text-base">{t(kind === "journal" ? "push.journal" : "push.reminders")}</span>
          <Switch id={`push-${kind}`} checked={device?.[kind] ?? false} disabled={disabled}
            aria-describedby={!online ? "push-state push-offline" : "push-state"} onCheckedChange={(value) => change(kind, value)} />
        </Label>)}
      </div>
      <p className="text-sm text-muted-foreground">{t("push.deviceOnly")}</p>
      {error && <p role="alert" className="text-sm text-destructive">{t(error)}</p>}
    </main>
  </div>;
}
