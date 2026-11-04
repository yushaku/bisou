import { useState, type FormEvent } from "react";
import { DISPLAY_NAME_MAX, type Locale, type User } from "../../shared/types";
import { api } from "../api";
import { LanguageToggle } from "../components/LanguageToggle";
import { Heart, PrimaryButton, Screen, TextButton } from "../components/ui";
import { inputClass } from "../components/styles";
import { useI18n } from "../i18n";

// Placeholder home for the login spike: proves the session, nothing more.
export function Home({ user, onUser, onSignedOut }: { user: User; onUser: (u: User) => void; onSignedOut: () => void }) {
  const { t } = useI18n();
  const [name, setName] = useState(user.displayName ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

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

  return (
    <Screen>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-pink">
          <Heart className="size-7" />
          <span className="text-lg font-bold text-text">{t("appName")}</span>
        </div>
        <LanguageToggle onChange={(l) => void changeLocale(l)} />
      </div>

      <section className="mt-10">
        <h1 className="text-2xl font-bold">{t("home.hello", { name: user.displayName ?? user.email })}</h1>
        <p className="mt-1 text-sm text-subtext0">{t("home.signedInAs", { email: user.email })}</p>
      </section>

      <form onSubmit={save} className="mt-8 flex flex-col gap-3 rounded-3xl bg-mantle p-5">
        <label htmlFor="displayName" className="text-sm font-medium text-subtext1">
          {t("home.displayName")}
        </label>
        <input
          id="displayName"
          value={name}
          maxLength={DISPLAY_NAME_MAX}
          autoComplete="nickname"
          placeholder={t("home.displayNamePlaceholder")}
          onChange={(e) => {
            setName(e.target.value);
            setStatus("idle");
          }}
          className={inputClass + " bg-base"}
        />
        {status === "saved" && <p className="text-sm text-green">{t("home.saved")}</p>}
        {status === "error" && (
          <p role="alert" className="text-sm text-red">
            {t("error.generic")}
          </p>
        )}
        <PrimaryButton type="submit" disabled={status === "saving"}>
          {status === "saving" ? t("home.saving") : t("home.save")}
        </PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-overlay1">{t("home.comingSoon")}</p>

      <div className="mt-auto flex justify-center pt-10">
        <TextButton type="button" onClick={() => void logout()}>
          {t("home.logout")}
        </TextButton>
      </div>
    </Screen>
  );
}
