import { useOnline } from "../lib/useOnline";
import { Bell, Cake, CalendarHeart, CircleCheck, CircleUserRound, Heart, LogOut, Mail, UserRound } from "lucide-react";
import { currentSubscription } from "../lib/push";
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "@/components/ui/ding-toaster";
import { useLocation } from "wouter";
import { DISPLAY_NAME_MAX, type Couple, type Locale } from "../../shared/types";
import { api } from "../api";
import { BottomBar } from "../components/bisou/AppShell";
import { CoupleAvatars, PersonAvatar, toPeople, type Person } from "../components/bisou/CoupleAvatars";
import { displayName } from "../lib/displayName";
import type { CropRequest } from "../components/bisou/PhotoCropDialog";
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
import { avatarFileError, avatarRetryWait, decodePhoto, renderAvatar, type Area } from "../lib/photo";
import { fitSquare } from "../lib/compose";
import type { SessionProps } from "./SignedInShell";

const DateSheet = lazy(() => import("../components/bisou/DateSheet").then((m) => ({ default: m.DateSheet })));
const PhotoCropDialog = lazy(() => import("../components/bisou/PhotoCropDialog").then((m) => ({ default: m.PhotoCropDialog })));

export function Settings({ user, onUser, onSignedOut, couple, onCouple }: SessionProps & {
  couple: Couple | null | undefined;
  onCouple: (couple: Couple | null) => void;
}) {
  const { t, locale } = useI18n();
  const online = useOnline();
  const [, navigate] = useLocation();
  const navigation = useTabNavigation();
  const sheetButton = useRef<HTMLButtonElement>(null);
  const birthdayButton = useRef<HTMLButtonElement>(null);
  const [birthdayOpen, setBirthdayOpen] = useState(false);
  const [birthdayLoaded, setBirthdayLoaded] = useState(false);
  const dateButton = useRef<HTMLButtonElement>(null);
  const [sheet, setSheet] = useState<"profile" | "logout" | "avatar">("profile");
  const [open, setOpen] = useState(false);
  const [picking, setPicking] = useState(false);
  const [dateLoaded, setDateLoaded] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);
  const cancelCrop = useRef<(() => void) | null>(null);
  const mounted = useRef(true);
  const [cropping, setCropping] = useState<CropRequest | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; cancelCrop.current?.(); };
  }, []);
  const paired = (couple?.members.length ?? 0) >= 2;
  const partner = paired ? couple?.members.find((member) => member.id !== user.id) : null;
  const members = toPeople(couple?.members ?? [], user, t);
  const people: [Person, Person] | null = paired ? [members[0]!, members[1]!] : null;
  const ownPerson = toPeople([user], user, t)[0]!;

  function openAvatar(button: HTMLButtonElement) {
    sheetButton.current = button;
    setSheet("avatar");
    setRemovingAvatar(false);
    setOpen(true);
  }

  async function pickAvatar(file: File) {
    if (!online) return;
    const error = avatarFileError(file);
    if (error) { toast.error(t(error)); return; }
    setAvatarBusy(true);
    let bitmap: ImageBitmap;
    try { bitmap = await decodePhoto(file); } catch {
      toast.error(t("avatar.decodeFailed"));
      setAvatarBusy(false);
      return;
    }
    if (!mounted.current) { bitmap.close(); return; }
    setOpen(false);
    try {
      const area = await new Promise<Area | null>((resolve) => {
        const url = URL.createObjectURL(file);
        const done = (area: Area | null) => {
          URL.revokeObjectURL(url);
          cancelCrop.current = null;
          if (mounted.current) setCropping(null);
          resolve(area && fitSquare(area, bitmap));
        };
        cancelCrop.current = () => done(null);
        setCropping({ url, index: 0, total: 1, round: true, done });
      });
      if (!area) { bitmap.close(); return; }
      const blob = await renderAvatar(bitmap, area);
      if (!navigator.onLine) { toast.error(t("offline.save")); return; }
      const res = await api.setAvatar(blob);
      if (res.ok) { onUser(res.data.user); toast.success(t("avatar.saved")); }
      else toast.error(res.status === 429
        ? t("avatar.rateLimited", { wait: avatarRetryWait(locale, res.error?.retryAfter ?? 60) })
        : t("avatar.saveFailed"));
    } catch {
      bitmap.close();
      toast.error(t("avatar.saveFailed"));
    } finally {
      if (mounted.current) {
        setAvatarBusy(false);
        sheetButton.current?.focus({ preventScroll: true });
      }
    }
  }

  async function removeAvatar() {
    if (!online) return;
    setAvatarBusy(true);
    const res = await api.removeAvatar();
    setAvatarBusy(false);
    if (res.ok) {
      onUser(res.data.user);
      setOpen(false);
      toast.success(t("avatar.removed"));
    } else toast.error(t("avatar.saveFailed"));
  }

  async function changeLocale(next: Locale) {
    if (!online) return;
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
    if (!online) return;
    setLoggingOut(true);
    setLogoutError(false);
    try {
      const subscription = await currentSubscription();
      const res = await api.logout(subscription?.endpoint);
      if (res.ok) {
        await subscription?.unsubscribe().catch(() => {});
        navigate("/", { replace: true });
        onSignedOut();
      } else setLogoutError(true);
    } catch { setLogoutError(true); }
    finally { setLoggingOut(false); }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SubPageHeader title={t("settings.title")} />
      <p id="settings-offline" role="status" className="sticky top-[calc(env(safe-area-inset-top)+--spacing(14))] z-30 bg-warning px-4 py-3 text-center text-sm text-warning-foreground empty:py-0">{!online ? t("offline.bar") : ""}</p>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-3 pb-[max(--spacing(6),env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-4 rounded-xl edge bg-card p-4 text-card-foreground">
          <button type="button" aria-label={t("avatar.change")} aria-busy={avatarBusy} disabled={avatarBusy}
            className="min-h-11 min-w-11 shrink-0 rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            onClick={(event) => openAvatar(event.currentTarget)}>
            {people ? <CoupleAvatars people={people} /> : <PersonAvatar person={ownPerson} />}
          </button>
          <div className="min-w-0">
            <p className="break-words font-heading text-xl">{displayName(user, t)}</p>
            <p className="break-all text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Drawer open={open} onOpenChange={setOpen}>
          <SettingsGroup title={t("settings.account")}>
            <SettingsRow icon={CircleUserRound} label={t("avatar.row")} value={t(user.avatarId ? "avatar.set" : "settings.notSet")}
              disabled={avatarBusy} onClick={(event) => openAvatar(event.currentTarget)} />
            {user.displayName && <DrawerTrigger asChild>
              <SettingsRow icon={UserRound} label={t("home.displayName")} value={user.displayName} onClick={(event) => { sheetButton.current = event.currentTarget; setSheet("profile"); }} />
            </DrawerTrigger>}
            <SettingsRow ref={birthdayButton} icon={Cake} label={t("settings.birthday")}
              value={user.birthDate ? formatDay(user.birthDate, locale, "numeric") : t("settings.notSet")}
              onClick={() => { setBirthdayLoaded(true); setBirthdayOpen(true); }} />
            <SettingsRow icon={Mail} label={t("login.email")} value={user.email} />
          </SettingsGroup>
          {paired && couple && <SettingsGroup title={t("settings.couple")}>
            <SettingsRow icon={Heart} label={t("settings.partner")} value={displayName(partner, t)} />
            <SettingsRow ref={dateButton} icon={CalendarHeart} label={t("settings.startDate")}
              value={couple.startDate ? formatDay(couple.startDate, locale, "numeric") : t("settings.notSet")}
              onClick={() => { setDateLoaded(true); setPicking(true); }} />
          </SettingsGroup>}
          <AppearanceSettings onLocaleChange={(next) => void changeLocale(next)} onOpen={() => {
            history.replaceState({ ...history.state, focus: "appearance-row" }, "");
            navigate("/settings/appearance", { state: { from: "/settings" } });
          }} />
          {paired && <div className="overflow-hidden rounded-xl edge bg-card">
            <SettingsRow id="notifications-row" icon={Bell} label={t("push.title")} onClick={() => {
              history.replaceState({ ...history.state, focus: "notifications-row" }, "");
              navigate("/settings/notifications", { state: { from: "/settings" } });
            }} />
          </div>}
          <div className="overflow-hidden rounded-xl edge bg-card">
            <DrawerTrigger asChild>
              <SettingsRow icon={LogOut} label={t("home.logout")} className="text-destructive" onClick={(event) => { sheetButton.current = event.currentTarget; setSheet("logout"); setLogoutError(false); }} />
            </DrawerTrigger>
          </div>
          <DrawerContent onCloseAutoFocus={(event) => { event.preventDefault(); sheetButton.current?.focus({ preventScroll: true }); }}>
            <div className="mx-auto w-full max-w-md overflow-y-auto px-4 pb-6">
              <DrawerHeader className="px-0 text-left">
                <DrawerTitle className="font-heading text-2xl">{t(sheet === "avatar" ? "avatar.row" : sheet === "profile" ? "home.displayName" : "settings.logoutConfirm")}</DrawerTitle>
                <DrawerDescription className={sheet !== "logout" ? "sr-only" : undefined}>
                  {t(sheet === "avatar" ? "avatar.change" : sheet === "profile" ? "home.displayNamePlaceholder" : "settings.logoutHint")}
                </DrawerDescription>
              </DrawerHeader>
              {sheet === "avatar" ? <div className="flex flex-col gap-3">
                <Button aria-describedby={!online ? "settings-offline" : undefined} disabled={!online} loading={avatarBusy} onClick={() => avatarInput.current?.click()}>{t("avatar.choose")}</Button>
                {user.avatarId && (removingAvatar ? <>
                  <p id="avatar-remove-confirm">{t("avatar.removeConfirm")}</p>
                  <Button autoFocus variant="destructive" aria-describedby={!online ? "avatar-remove-confirm settings-offline" : "avatar-remove-confirm"} disabled={!online} loading={avatarBusy} onClick={() => void removeAvatar()}>{t("avatar.remove")}</Button>
                </> : <Button variant="destructive" disabled={avatarBusy} onClick={() => setRemovingAvatar(true)}>{t("avatar.remove")}</Button>)}
              </div> : sheet === "profile" ? <ProfileForm key={String(open)} user={user} onUser={onUser} /> : <>
                {logoutError && <p role="alert" className="mb-3 text-destructive">{t("error.generic")}</p>}
                <Button variant="destructive" aria-describedby={!online ? "settings-offline" : undefined} disabled={!online} className="w-full" loading={loggingOut} onClick={() => void logout()}>{t("home.logout")}</Button>
              </>}
              <Button variant="outline" className="mt-3 w-full" disabled={avatarBusy} onClick={() => setOpen(false)}>{t(sheet === "logout" ? "settings.cancel" : "common.close")}</Button>
            </div>
          </DrawerContent>
        </Drawer>
        <input ref={avatarInput} type="file" accept="image/*" className="hidden" onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          event.currentTarget.value = "";
          if (file) void pickAvatar(file);
        }} />
        {cropping && <Suspense fallback={null}><PhotoCropDialog request={cropping} /></Suspense>}
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
  const online = useOnline();
  const [name, setName] = useState(user.displayName ?? "");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!online || !name.trim() || status === "saving") return;
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
      <Button type="submit" variant="outline" loading={status === "saving"} aria-describedby={!online ? "settings-offline" : undefined} disabled={!online || !name.trim()}>
        {status === "saving" ? t("home.saving") : t("home.save")}
      </Button>
    </form>
  );
}
