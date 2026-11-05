import { demoSpin } from "./samples";
import { BookHeart, Gift, PartyPopper } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Celebration } from "@/components/bisou/Celebration";
import { CoupleAvatars } from "@/components/bisou/CoupleAvatars";
import { DaysCounter } from "@/components/bisou/DaysCounter";
import { EmptyState } from "@/components/bisou/EmptyState";
import { EntryCard } from "@/components/bisou/EntryCard";
import { MilestoneItem } from "@/components/bisou/MilestoneItem";
import { OtpInput } from "@/components/bisou/OtpInput";
import { PageHeader } from "@/components/bisou/PageHeader";
import { PairCodeDisplay } from "@/components/bisou/PairCodeDisplay";
import { PhotoGrid } from "@/components/bisou/PhotoGrid";
import { SpinCard } from "@/components/bisou/SpinCard";
import { WishCard } from "@/components/bisou/WishCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n";
import { useDesignT } from "./messages";
import { COUPLE, ENTRIES, MILESTONES, MY_WISHES, PAIR_CODE, PHOTOS, QUOC_BAO, START_DATE, TODAY } from "./samples";

function Block({ title, children, wide = false }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <div className={wide ? "flex flex-col gap-3 lg:col-span-2" : "flex flex-col gap-3"}>
      <h3 className="font-heading text-xl">{title}</h3>
      {children}
    </div>
  );
}

export function ComponentsSection() {
  const d = useDesignT();
  const { t } = useI18n();
  const [code, setCode] = useState("2804");
  const [party, setParty] = useState(false);
  const photos = [PHOTOS.hoanKiem, PHOTOS.coffee, PHOTOS.hoiAn, PHOTOS.daLat];
  const [e0, , e2] = ENTRIES;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
      <Block title="PageHeader">
        <PageHeader title={t("nav.journal")} description="Minh Anh và Quốc Bảo" action={<Button size="sm">{t("journal.new")}</Button>} />
      </Block>

      <Block title="CoupleAvatars">
        <div className="flex flex-wrap items-center gap-6">
          <CoupleAvatars people={COUPLE} size="sm" />
          <CoupleAvatars people={COUPLE} />
          <CoupleAvatars people={COUPLE} size="lg" />
        </div>
      </Block>

      <Block title="DaysCounter">
        <DaysCounter startDate={START_DATE} people={COUPLE} today={TODAY} />
      </Block>

      <Block title="PairCodeDisplay">
        <PairCodeDisplay code={PAIR_CODE} expiresInMinutes={15} />
      </Block>

      <Block title="EntryCard">
        {e0 && <EntryCard entry={e0} />}
        {e2 && <EntryCard entry={e2} />}
      </Block>

      <Block title="PhotoGrid (1 to 4)">
        <div className="grid grid-cols-2 gap-6 p-2">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="flex flex-col gap-1">
              <PhotoGrid photos={photos.slice(0, n)} />
              <span className="text-sm text-muted-foreground">{d("photoCount", { count: n })}</span>
            </div>
          ))}
        </div>
      </Block>

      <Block title="MilestoneItem">
        <ol className="py-1">
          {MILESTONES.map((m, i) => (
            <MilestoneItem key={m.id} milestone={m} last={i === MILESTONES.length - 1} />
          ))}
        </ol>
      </Block>

      <Block title="WishCard">
        {MY_WISHES.map((w) => (
          <WishCard key={w.id} wish={w} />
        ))}
      </Block>

      <Block title="SpinCard">
        <SpinCard partnerName={QUOC_BAO.name} onSpin={demoSpin} onClaim={async () => ({ ok: false, status: 0, error: null })} />
        <SpinCard partnerName={QUOC_BAO.name} onSpin={demoSpin} onClaim={async () => ({ ok: false, status: 0, error: null })} initialBudget={100_000} initialState={{ step: "empty" }} />
      </Block>

      <Block title="EmptyState, Celebration">
        <EmptyState icon={BookHeart} title={t("empty.journal")} action={{ label: t("empty.journalAction"), onClick: () => undefined }} />
        <EmptyState icon={Gift} title={t("empty.wishes")} action={{ label: t("empty.wishesAction"), onClick: () => undefined }} />
        <Button variant="secondary" className="self-start" onClick={() => setParty(true)}>
          <PartyPopper aria-hidden="true" />
          {d("celebrate")}
        </Button>
        <Celebration open={party} onOpenChange={setParty} />
      </Block>

      <Block title="OtpInput">
        <Label htmlFor="d-otp">{t("login.code")}</Label>
        <OtpInput id="d-otp" value={code} onChange={(raw) => setCode(raw.replace(/\D/g, "").slice(0, 6))} />
        <Label htmlFor="d-otp-err" className="mt-2">{`${t("login.code")} (${d("stateError")})`}</Label>
        <OtpInput id="d-otp-err" value="123456" onChange={() => undefined} invalid aria-describedby="d-otp-err-msg" />
        <span id="d-otp-err-msg" className="text-base text-destructive">{t("error.invalid_code_left", { count: 3 })}</span>
      </Block>
    </div>
  );
}
