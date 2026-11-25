import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "../ui/ding-toaster";
import { Button } from "../ui/button";
import { useI18n } from "../../i18n";
import { BUILD_ID } from "../../lib/devicePersist";
import { requestAppUpdate } from "../../lib/updateReload";
import { useOnline } from "../../lib/useOnline";
import { SettingsGroup, SettingsRow } from "./SettingsGroup";

export function AppUpdateSettings() {
  const { t } = useI18n();
  const online = useOnline();
  const [busy, setBusy] = useState(false);

  async function update() {
    if (!online || busy) return;
    setBusy(true);
    try {
      const result = await requestAppUpdate();
      if (result === "current") toast.success(t("settings.upToDate"));
      else if (result === "unavailable") toast.error(t("settings.updateUnavailable"));
    } catch {
      toast.error(t("settings.updateFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsGroup title={t("settings.app")}>
      <SettingsRow label={t("settings.version")} value={BUILD_ID} />
      <div className="flex flex-col gap-2 p-4">
        <Button
          variant="outline"
          loading={busy}
          disabled={!online}
          aria-describedby="app-update-hint"
          onClick={() => void update()}
        >
          <Download aria-hidden="true" />
          {busy ? t("settings.updating") : t("settings.update")}
        </Button>
        <p id="app-update-hint" className="text-sm text-muted-foreground" role="status">
          {!online ? t("settings.updateOffline") : busy ? t("settings.updatingHint") : t("settings.updateHint")}
        </p>
      </div>
    </SettingsGroup>
  );
}
