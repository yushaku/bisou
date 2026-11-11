import { useEffect } from "react";
import { toast } from "@/components/ui/ding-toaster";
import { useI18n } from "@/i18n";
import { useOnline } from "@/lib/useOnline";

/** Keeps one offline toast up while offline; a newer toast may replace it, and it is dismissed when the connection returns. */
export function OfflineNotice() {
  const { t } = useI18n();
  const online = useOnline();
  const title = t("offline.title");
  const description = t("offline.body");
  const label = t("offline.retry");
  useEffect(() => {
    if (online) return;
    // Retry reloads once the browser sees a connection; otherwise the same toast stays.
    const action = { label, onClick: () => (navigator.onLine ? window.location.reload() : { title, description, action }) };
    const id = toast.error(title, { description, action, duration: 0 });
    return () => toast.dismiss(id);
  }, [online, title, description, label]);
  return null;
}
