import { CircleCheck, LogOut } from "lucide-react";
import { useState, type FormEvent } from "react";
import { DISPLAY_NAME_MAX, type Locale, type User } from "../../shared/types";
import { api } from "../api";
import { AppShell } from "../components/bisou/AppShell";
import { PageHeader } from "../components/bisou/PageHeader";
import { SettingsSheet } from "../components/bisou/SettingsSheet";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useI18n } from "../i18n";

// Placeholder home for the login spike: proves the session, nothing more.
export function Home({ user, onUser, onSignedOut }: { user: User; onUser: (u: User) => void; onSignedOut: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(user.displayName ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [settingsOpen, setSettingsOpen] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setStatus("saving");
    const res = await api.updateMe({ displayName: name });
    if (res.ok) {
      onUser(res.data.user);
      setName(res.data.user.displayName ?? "");
      setStatus("saved");
    } else setStatus("error");
  }

  async function changeLocale(locale: Locale) {
    const res = await api.updateMe({ locale });
    if (res.ok) onUser(res.data.user);
  }

  async function logout() {
    await api.logout();
    onSignedOut();
  }

  const logoutButton = (
    <Button type="button" variant="ghost" className="self-center" onClick={() => void logout()}>
      <LogOut aria-hidden="true" />
      {t("home.logout")}
    </Button>
  );

  return (
    <AppShell onOpenSettings={() => setSettingsOpen(true)}>
      <PageHeader
        title={t("home.hello", { name: user.displayName ?? user.email })}
        description={t("home.signedInAs", { email: user.email })}
      />

      <Card className="px-5 py-5">
        <form onSubmit={save} className="flex flex-col gap-3">
          <h2 className="font-heading text-xl">{t("home.profile")}</h2>
          <Label htmlFor="displayName">{t("home.displayName")}</Label>
          <Input
            id="displayName"
            value={name}
            maxLength={DISPLAY_NAME_MAX}
            autoComplete="nickname"
            placeholder={t("home.displayNamePlaceholder")}
            onChange={(e) => {
              setName(e.target.value);
              setStatus("idle");
            }}
          />
          {status === "saved" && (
            <p role="status" className="flex items-center gap-2 text-base">
              <CircleCheck className="size-5 text-success" aria-hidden="true" />
              {t("home.saved")}
            </p>
          )}
          {status === "error" && (
            <p role="alert" className="text-base text-destructive">
              {t("error.generic")}
            </p>
          )}
          <Button type="submit" loading={status === "saving"}>
            {status === "saving" ? t("home.saving") : t("home.save")}
          </Button>
        </form>
      </Card>

      <p className="mt-6 text-base text-muted-foreground">{t("home.comingSoon")}</p>

      <div className="mt-auto flex justify-center pt-10">{logoutButton}</div>

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} onLocaleChange={(l) => void changeLocale(l)}>
        {logoutButton}
      </SettingsSheet>
    </AppShell>
  );
}
