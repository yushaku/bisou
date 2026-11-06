import { Share, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useI18n } from "@/i18n";
import { clearInstallPrompt, useInstallPrompt } from "@/lib/install";

const DISMISSED = "bisou.install.dismissed";
const standalone = () => (typeof matchMedia === "function" && matchMedia("(display-mode: standalone)").matches)
  || (typeof navigator !== "undefined" && (navigator as Navigator & { standalone?: boolean }).standalone === true);

export function InstallCard() {
  const { t } = useI18n();
  const prompt = useInstallPrompt();
  const [installed, setInstalled] = useState(standalone);
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISSED) === "1"; } catch { return false; }
  });
  const [installing, setInstalling] = useState(false);
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const iphoneSafari = /iPhone/.test(ua) && /Version\/.*Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|GSA|DuckDuckGo/.test(ua);

  useEffect(() => {
    const query = matchMedia("(display-mode: standalone)");
    const changed = () => setInstalled(standalone());
    const installed = () => setInstalled(true);
    query.addEventListener("change", changed);
    window.addEventListener("appinstalled", installed);
    return () => { query.removeEventListener("change", changed); window.removeEventListener("appinstalled", installed); };
  }, []);

  if (installed || dismissed || (!iphoneSafari && !prompt)) return null;

  async function install() {
    if (!prompt || installing) return;
    setInstalling(true);
    try {
      await prompt.prompt();
      if ((await prompt.userChoice).outcome === "accepted") setInstalled(true);
    } catch {
      console.error("[bisou] install prompt failed");
    } finally {
      clearInstallPrompt();
      setInstalling(false);
    }
  }

  return <Card className={`relative mb-5 gap-3 p-4 ${iphoneSafari ? "order-first" : "mt-5"}`}>
    <h2 className="pr-10 font-heading text-xl">{t("install.title")}</h2>
    <Button variant="ghost" size="icon" className="absolute top-2 right-2" aria-label={t("install.dismiss")} onClick={() => {
      document.querySelector<HTMLElement>("main")?.focus({ preventScroll: true });
      setDismissed(true);
      try { localStorage.setItem(DISMISSED, "1"); } catch { /* The dismissal still lasts for this visit. */ }
    }}><X aria-hidden="true" /></Button>
    {iphoneSafari ? <ol className="flex list-inside list-decimal flex-col gap-2 text-sm text-muted-foreground">
      <li>{t("install.share")} <Share className="inline size-4 align-text-bottom" aria-hidden="true" /></li>
      <li>{t("install.addToHome")}</li>
      <li>{t("install.confirm")}</li>
    </ol> : <Button loading={installing} onClick={() => void install()}>{t("install.button")}</Button>}
  </Card>;
}
