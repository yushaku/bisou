import { Component, type ReactNode } from "react";
import { useI18n } from "@/i18n";
import { Button } from "@/components/ui/button";
import { Mascot } from "./Mascot";

function ErrorScreen() {
  const { t } = useI18n();
  return <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-[max(--spacing(6),env(safe-area-inset-top))] text-foreground">
    <div className="flex max-w-md flex-col items-center gap-4 text-center" role="alert">
      <Mascot situation="error" />
      <h1 className="font-heading text-2xl">{t("errorScreen.title")}</h1>
      <p className="text-muted-foreground">{t("errorScreen.body")}</p>
      <Button onClick={() => location.reload()}>{t("errorScreen.reload")}</Button>
    </div>
  </main>;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error) { console.error("[bisou] render failed", error); }
  render() { return this.state.failed ? <ErrorScreen /> : this.props.children; }
}
