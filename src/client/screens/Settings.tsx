import { Cake, CalendarHeart, CircleCheck, Heart, LogOut, Mail, UserRound } from "lucide-react";
import { lazy, Suspense, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { DISPLAY_NAME_MAX, type Couple, type Locale } from "../../shared/types";
import { api } from "../api";
import { BottomBar } from "../components/bisou/AppShell";
import { CoupleAvatars, PersonAvatar, type Person } from "../components/bisou/CoupleAvatars";
import { SubPageHeader } from "../components/bisou/SubPageHeader";
import { SettingsGroup, SettingsRow } from "../components/bisou/SettingsGroup";
import { AppearanceSettings } from "../components/bisou/ThemeControls";
import { Button } from "../components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle, DrawerTrigger } from "../components/ui/drawer";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useI18n } from "../i18n";
import { formatDay } from "../lib/format";
import { startDateError } from "../lib/startDate";
import { useTabNavigation } from "../lib/useTabNavigation";
import type { SessionProps } from "./SignedInShell";

const DateSheet = lazy(() => import("../components/bisou/DateSheet").then((m) => ({ default: m.DateSheet })));

export function Settings({ user, onUser, onSignedOut, couple, onCouple }: SessionProps & {
  couple: Couple | null | undefined;
  onCouple: (couple: Couple | null) => void;
}) {
  const { t, locale } = useI18n();
  const [, navigate] = useLocation();
  const navigation = useTabNavigation();
  const sheetButton = useRef<HTMLButtonElement>(null);
  const birthdayButton = useRef<HTMLButtonElement>(null);
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [birthdayLoaded, setBirthdayLoaded] = useState(false);
  const dateButton = useRef<HTMLButtonElement>(null);
  const [sheet, setSheet] = useState<"profile" | "logout">("profile");
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [dateLoaded, setDateLoaded] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const paired = (couple?.members.length ?? 0) >= 2;
  const partner = paired ? couple?.members.find((member) => member.id !== user.id) : null;
  const people = paired ? couple!.members.slice(0, 2).map((member, i) => ({
    name: (member.id === user.id ? user.displayName : member.displayName) ?? "?",
    tone: i === 0 ? "primary" : "secondary",
  })) as [Person, Person] : null;

  async function changeLocale(next: Locale) {
    const res = await api.updateMe({ locale: next });
    if (res.ok) onUser(res.data.user);
    else toast.error(t("error.generic"));
  }

  async function saveStartDate(day: string): Promise<string | null> {
    const res = await api.setStartDate(day);
    if (!res.ok) return startDateError(t, res.status, res.error);
    onCouple(res.data.couple);
    toast.success(t("startDate.saved"));
    return null;
  }

  async function saveBirthday(birthDate: string | null): Promise<string | null> {
    const res = await api.updateMe({ birthDate });
    if (!res.ok) return t(res.error?.error === "invalid_birth_date" ? "birthday.invalid" : "error.generic");
    onUser(res.data.user);
    toast.success(t(birthDate ? "birthday.saved" : "birthday.removed"));
    return null;
  }

  async function logout() {
    setLoggingOut(true);
    setLogoutError(false);
    const res = await api.logout();
    setLoggingOut(false);
    if (res.ok) {
      navigate("/", { replace: true });
      onSignedOut();
    } else setLogoutError(true);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SubPageHeader title={t("settings.title")} />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-3 pb-[max(--spacing(6),env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-4 rounded-xl edge bg-card p-4 text-card-foreground">
          {people ? <CoupleAvatars people={people} /> : <PersonAvatar person={{ name: user.displayName ?? user.email, tone: "primary" }} />}
          <div className="min-w-0">
            <p className="break-words font-heading text-xl">{user.displayName ?? t("settings.yourProfile")}</p>
            <p className="break-all text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Drawer open={open} onOpenChange={setOpen}>
          <SettingsGroup title={t("settings.account")}>
            {user.displayName && <DrawerTrigger asChild>
              <SettingsRow icon={UserRound} label={t("home.displayName")} value={user.displayName} onClick={(event) => { sheetButton.current = event.currentTarget; setSheet("profile"); }} />
            </DrawerTrigger>}
            <SettingsRow ref={birthdayButton} icon={Cake} label={t("settings.birthday")}
              value={user.birthDate ? formatDay(user.birthDate, locale, "numeric") : t("settings.notSet")}
              onClick={() => { setBirthdayLoaded(true); setBirthdayOpen(true); }} />
            <SettingsRow icon={Mail} label={t("login.email")} value={user.email} />
          </SettingsGroup>
          {paired && couple && <SettingsGroup title={t("settings.couple")}>
            <SettingsRow icon={Heart} label={t("settings.partner")} value={partner?.displayName ?? "?"} />
            <SettingsRow ref={dateButton} icon={CalendarHeart} label={t("settings.startDate")}
              value={couple.startDate ? formatDay(couple.startDate, locale, "numeric") : t("settings.notSet")}
              onClick={() => { setDateLoaded(true); setPicking(true); }} />
          </SettingsGroup>}
          <AppearanceSettings onLocaleChange={(next) => void changeLocale(next)} />
          <div className="overflow-hidden rounded-xl edge bg-card">
            <DrawerTrigger asChild>
              <SettingsRow icon={LogOut} label={t("home.logout")} className="text-destructive" onClick={(event) => { sheetButton.current = event.currentTarget; setSheet("logout"); setLogoutError(false); }} />
            </DrawerTrigger>
          </div>
          <DrawerContent onCloseAutoFocus={(event) => { event.preventDefault(); sheetButton.current?.focus({ preventScroll: true }); }}>
            <div className="mx-auto w-full max-w-md overflow-y-auto px-4 pb-6">
              <DrawerHeader className="px-0 text-left">
                <DrawerTitle className="font-heading text-2xl">{t(sheet === "profile" ? "home.displayName" : "settings.logoutConfirm")}</DrawerTitle>
                <DrawerDescription className={sheet === "profile" ? "sr-only" : undefined}>
                  {t(sheet === "profile" ? "home.displayNamePlaceholder" : "settings.logoutHint")}
                </DrawerDescription>
              </DrawerHeader>
              {sheet === "profile" ? <ProfileForm key={String(open)} user={user} onUser={onUser} /> : <>
                {logoutError && <p role="alert" className="mb-3 text-destructive">{t("error.generic")}</p>}
                <Button variant="destructive" className="w-full" loading={loggingOut} onClick={() => void logout()}>{t("home.logout")}</Button>
              </>}
              <Button variant="outline" className="mt-3 w-full" onClick={() => setOpen(false)}>{t(sheet === "profile" ? "common.close" : "settings.cancel")}</Button>
            </div>
          </DrawerContent>
        </Drawer>
        {birthdayLoaded && <Suspense fallback={null}>
          <DateSheet title={t("birthday.title")} hint={t("birthday.hint")} saveLabel={t("birthday.save")}
            firstMonth={new Date(1900, 0, 1)} emptyMonth={new Date(2000, 0, 1)}
            open={birthdayOpen} onOpenChange={(next) => {
              setBirthdayOpen(next);
              if (!next) birthdayButton.current?.focus({ preventScroll: true });
            }} value={user.birthDate} onSave={saveBirthday} onRemove={() => saveBirthday(null)} />
        </Suspense>}
        {dateLoaded && couple && <Suspense fallback={null}>
          <DateSheet title={t("startDate.title")} hint={t("startDate.hint")} saveLabel={t("startDate.save")} firstMonth={new Date(1950, 0, 1)} open={picking} onOpenChange={(next) => {
            setPicking(next);
            if (!next) dateButton.current?.focus({ preventScroll: true });
          }} value={couple.startDate} onSave={saveStartDate} />
        </Suspense>}
      </main>
      {paired && <BottomBar {...navigation} />}
    </div>
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
