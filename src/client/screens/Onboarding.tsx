import { useId, useState, type FormEvent } from "react";
import { DISPLAY_NAME_MAX } from "../../shared/types";
import { api } from "../api";
import couple from "../assets/couple.webp";
import { PageHeader } from "../components/bisou/PageHeader";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useI18n } from "../i18n";
import { SignedInShell, type SessionProps } from "./SignedInShell";

/* First screen after the first login: the name the partner will see (required, 1 to 40 chars). */
export function Onboarding(props: SessionProps) {
  const { t } = useI18n();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorId = useId();

  async function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("onboarding.nameRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    const res = await api.updateMe({ displayName: trimmed });
    setBusy(false);
    if (res.ok) props.onUser(res.data.user);
    else setError(res.status === 0 ? t("error.network") : t("error.generic"));
  }

  return (
    <SignedInShell {...props}>
      <img src={couple} alt="" width={640} height={466} className="mx-auto mt-2 h-40 w-56 object-contain" />
      <PageHeader title={t("onboarding.title")} description={t("onboarding.body")} />
      <Card className="px-5 py-5">
        <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
          <Label htmlFor="onboarding-name">{t("home.displayName")}</Label>
          <Input
            id="onboarding-name"
            value={name}
            required
            autoFocus
            maxLength={DISPLAY_NAME_MAX}
            autoComplete="nickname"
            enterKeyHint="next"
            placeholder={t("home.displayNamePlaceholder")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
          {error && (
            <p id={errorId} role="alert" className="text-base text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="mt-1" loading={busy} disabled={name.trim() === ""}>
            {t("onboarding.continue")}
          </Button>
        </form>
      </Card>
    </SignedInShell>
  );
}
