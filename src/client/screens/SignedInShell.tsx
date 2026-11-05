import { CircleCheck, LogOut } from "lucide-react";
import { useContext, useLayoutEffect, useState, type FormEvent, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";
import { DISPLAY_NAME_MAX, type Locale, type User } from "../../shared/types";
import { api } from "../api";
import { AppShell, type TabId } from "../components/bisou/AppShell";
import { SettingsSheet } from "../components/bisou/SettingsSheet";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useI18n } from "../i18n";
import { TabMemory } from "../lib/tabMemory";

export interface SessionProps {
  user: User;
  onUser: (user: User) => void;
  onSignedOut: () => void;
}

/* Tabs with a screen behind them. */
const LIVE_TABS: readonly TabId[] = ["home", "journal", "wishes"];
const TAB_PATH: Partial<Record<TabId, string>> = { home: "/", journal: "/journal", wishes: "/wishes" };

/* Animated where the browser supports view transitions and motion is welcome; instant otherwise. */
function switchTab(path: string, dir: 1 | -1, navigate: (to: string) => void) {
  const go = () => {
    // Layout effects restore the new tab before the transition captures it.
    flushSync(() => navigate(path));
  };
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) return go();
  document.documentElement.style.setProperty("--tab-dir", String(dir));
  document.startViewTransition(go);
}

/*
 * Signed-in frame: AppShell plus the Settings sheet with appearance, language and account.
 * `tab` shows the bottom tab bar with that tab active; onboarding and pairing leave it out.
 */
export function SignedInShell({
  user,
  onUser,
  onSignedOut,
  showProfile = true,
  tab,
  children,
}: SessionProps & { showProfile?: boolean; tab?: TabId; children: ReactNode }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const memory = useContext(TabMemory);

  useLayoutEffect(() => {
    if (!tab || !memory) return;
    window.scrollTo({ top: memory.scroll.get(tab) ?? 0, behavior: "instant" });
    const remember = () => memory.scroll.set(tab, window.scrollY);
    window.addEventListener("scroll", remember, { passive: true });
    return () => window.removeEventListener("scroll", remember);
  }, [tab, memory]);

  async function changeLocale(locale: Locale) {
    const res = await api.updateMe({ locale });
    if (res.ok) onUser(res.data.user);
  }

  async function logout() {
    await api.logout();
    onSignedOut();
  }

  return (
    <AppShell
      onOpenSettings={() => setOpen(true)}
      tabs={
        tab && {
          active: tab,
          items: LIVE_TABS,
          onSelect: (next) => {
            const path = TAB_PATH[next];
            memory?.scroll.set(tab, window.scrollY);
            if (next === tab) window.scrollTo({ top: 0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
            else if (path) switchTab(path, LIVE_TABS.indexOf(next) > LIVE_TABS.indexOf(tab) ? 1 : -1, navigate);
          },
        }
      }
    >
      {children}
      <SettingsSheet open={open} onOpenChange={setOpen} onLocaleChange={(l) => void changeLocale(l)}>
        {showProfile && <ProfileForm user={user} onUser={onUser} />}
        <Button type="button" variant="ghost" className="self-center" onClick={() => void logout()}>
          <LogOut aria-hidden="true" />
          {t("home.logout")}
        </Button>
      </SettingsSheet>
    </AppShell>
  );
}

function ProfileForm({ user, onUser }: Pick<SessionProps, "user" | "onUser">) {
  const { t } = useI18n();
  const [name, setName] = useState(user.displayName ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setStatus("saving");
    const res = await api.updateMe({ displayName: name });
    if (res.ok) {
      onUser(res.data.user);
      setName(res.data.user.displayName ?? "");
      setStatus("saved");
    } else setStatus("error");
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-3">
      <Label htmlFor="settings-name">{t("home.displayName")}</Label>
      <Input
        id="settings-name"
        value={name}
        required
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
      <Button type="submit" variant="outline" loading={status === "saving"} disabled={!name.trim()}>
        {status === "saving" ? t("home.saving") : t("home.save")}
      </Button>
    </form>
  );
}
