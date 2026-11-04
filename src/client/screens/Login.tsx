import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { ApiError, User } from "../../shared/types";
import { api } from "../api";
import { BrandMark } from "../components/bisou/BrandMark";
import { LanguageToggle } from "../components/bisou/LanguageToggle";
import { OtpInput } from "../components/bisou/OtpInput";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
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
  const errorId = useId();

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

  const errorLine = error && (
    <p id={errorId} role="alert" className="text-base text-destructive">
      {error}
    </p>
  );

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] pb-[calc(env(safe-area-inset-bottom)+1.5rem)]">
      <div className="flex justify-end">
        <LanguageToggle />
      </div>

      <div className="mt-8 flex flex-col items-center text-center">
        <BrandMark className="size-16" />
        <h1 className="mt-4 font-heading text-4xl">{t("appName")}</h1>
        <p className="mt-2 text-lg text-muted-foreground">{t("login.subtitle")}</p>
      </div>

      <Card className="mt-8 px-5 py-5">
        {step === "email" ? (
          <form onSubmit={onEmailSubmit} className="flex flex-col gap-3" noValidate>
            <Label htmlFor="email">{t("login.email")}</Label>
            <Input
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
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorId : undefined}
              onChange={(e) => setEmail(e.target.value)}
            />
            {errorLine}
            <Button type="submit" size="lg" className="mt-1" loading={busy} disabled={email.trim() === ""}>
              {busy ? t("login.sending") : t("login.sendCode")}
            </Button>
          </form>
        ) : (
          <form onSubmit={onCodeSubmit} className="flex flex-col gap-3">
            <p className="text-base text-muted-foreground">{t("login.codeSentTo", { email: email.trim() })}</p>
            <Label htmlFor="code">{t("login.code")}</Label>
            <OtpInput
              id="code"
              ref={codeRef}
              value={code}
              onChange={onCodeChange}
              disabled={busy}
              invalid={Boolean(error)}
              aria-describedby={error ? errorId : undefined}
            />
            {errorLine}
            {devNote && <p className="rounded-lg bg-muted p-3 text-sm">{devNote}</p>}
            <Button type="submit" size="lg" className="mt-1" loading={busy} disabled={code.length !== 6}>
              {busy ? t("login.verifying") : t("login.verify")}
            </Button>
            <div className="mt-1 flex flex-wrap items-center justify-between gap-x-4">
              <Button
                type="button"
                variant="link"
                className="h-11"
                disabled={busy}
                onClick={() => {
                  setStep("email");
                  setError(null);
                  setDevNote(null);
                }}
              >
                {t("login.changeEmail")}
              </Button>
              <Button type="button" variant="link" className="h-11" disabled={busy || cooldown > 0} onClick={() => void requestCode()}>
                {cooldown > 0 ? t("login.resendIn", { seconds: cooldown }) : t("login.resend")}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </main>
  );
}
