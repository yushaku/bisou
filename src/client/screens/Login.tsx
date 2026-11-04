import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ApiError, User } from "../../shared/types";
import { api } from "../api";
import { LanguageToggle } from "../components/LanguageToggle";
import { Heart, PrimaryButton, Screen, TextButton } from "../components/ui";
import { inputClass } from "../components/styles";
import { useI18n, type Translate } from "../i18n";

const RESEND_SECONDS = 60;

function errorText(t: Translate, status: number, error: ApiError | null): string {
  if (status === 0) return t("error.network");
  switch (error?.error) {
    case "invalid_email":
      return t("error.invalid_email");
    case "invalid_code":
      return error.attemptsLeft ? t("error.invalid_code_left", { count: error.attemptsLeft }) : t("error.invalid_code");
    case "too_many_attempts":
      return t("error.too_many_attempts");
    case "code_expired":
      return t("error.code_expired");
    case "rate_limited":
      return t("error.rate_limited", { seconds: error.retryAfter ?? RESEND_SECONDS });
    default:
      return t("error.generic");
  }
}

export function Login({ onSignedIn }: { onSignedIn: (user: User) => void }) {
  const { t, locale } = useI18n();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [devNote, setDevNote] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function requestCode() {
    setBusy(true);
    setError(null);
    const res = await api.requestCode(email, locale);
    setBusy(false);
    if (res.ok) {
      setDevNote(res.data.devNote ?? null);
      setCode("");
      setStep("code");
      setCooldown(RESEND_SECONDS);
      return;
    }
    // A code was sent less than a minute ago: let the user type that one, the countdown shows when to resend.
    if (res.error?.error === "rate_limited" && (res.error.retryAfter ?? 0) <= RESEND_SECONDS) {
      setStep("code");
      setCooldown(res.error.retryAfter ?? RESEND_SECONDS);
      return;
    }
    setError(errorText(t, res.status, res.error));
  }

  async function verify(value: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const res = await api.verifyCode(email, value, locale);
    setBusy(false);
    if (res.ok) {
      onSignedIn(res.data.user);
      return;
    }
    setError(errorText(t, res.status, res.error));
    setCode("");
    codeRef.current?.focus();
  }

  function onEmailSubmit(e: FormEvent) {
    e.preventDefault();
    void requestCode();
  }

  function onCodeSubmit(e: FormEvent) {
    e.preventDefault();
    if (code.length === 6) void verify(code);
  }

  function onCodeChange(raw: string) {
    // Accept pasted values like "123 456" or "Code: 123456".
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (digits.length === 6) void verify(digits);
  }

  return (
    <Screen>
      <div className="flex justify-end">
        <LanguageToggle />
      </div>
      <div className="mt-10 flex flex-col items-center text-center">
        <div className="flex size-20 items-center justify-center rounded-3xl bg-pink text-on-accent shadow-lg">
          <Heart className="size-11" />
        </div>
        <h1 className="mt-5 text-3xl font-bold">{t("appName")}</h1>
        <p className="mt-2 text-subtext0">{t("login.subtitle")}</p>
      </div>

      {step === "email" ? (
        <form onSubmit={onEmailSubmit} className="mt-10 flex flex-col gap-3" noValidate>
          <label htmlFor="email" className="text-sm font-medium text-subtext1">
            {t("login.email")}
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            value={email}
            placeholder={t("login.emailPlaceholder")}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass + " bg-mantle"}
          />
          {error && (
            <p role="alert" className="text-sm text-red">
              {error}
            </p>
          )}
          <PrimaryButton type="submit" disabled={busy || email.trim() === ""}>
            {busy ? t("login.sending") : t("login.sendCode")}
          </PrimaryButton>
        </form>
      ) : (
        <form onSubmit={onCodeSubmit} className="mt-10 flex flex-col gap-3">
          <p className="text-center text-sm text-subtext0">{t("login.codeSentTo", { email: email.trim() })}</p>
          <label htmlFor="code" className="text-sm font-medium text-subtext1">
            {t("login.code")}
          </label>
          <input
            id="code"
            ref={codeRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={12}
            value={code}
            placeholder="000000"
            onChange={(e) => onCodeChange(e.target.value)}
            className={inputClass + " bg-mantle text-center font-mono text-2xl tracking-[0.5em]"}
          />
          {error && (
            <p role="alert" className="text-sm text-red">
              {error}
            </p>
          )}
          {devNote && <p className="rounded-xl bg-surface0 p-3 text-xs text-subtext1">{devNote}</p>}
          <PrimaryButton type="submit" disabled={busy || code.length !== 6}>
            {busy ? t("login.verifying") : t("login.verify")}
          </PrimaryButton>
          <div className="mt-2 flex items-center justify-between">
            <TextButton
              type="button"
              onClick={() => {
                setStep("email");
                setError(null);
                setDevNote(null);
              }}
            >
              {t("login.changeEmail")}
            </TextButton>
            <TextButton type="button" disabled={busy || cooldown > 0} onClick={() => void requestCode()}>
              {cooldown > 0 ? t("login.resendIn", { seconds: cooldown }) : t("login.resend")}
            </TextButton>
          </div>
        </form>
      )}
    </Screen>
  );
}
