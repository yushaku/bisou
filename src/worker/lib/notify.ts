import { en } from "../../client/i18n/en";
import { vi, type MessageKey } from "../../client/i18n/vi";
import { addDays, vnDay, vnHour } from "../../shared/days";
import type { Env } from "../env";
import { sendPush, type PushRow } from "./webpush";

function translate(locale: string, key: MessageKey, vars: Record<string, string | number>): string {
  const text = (locale === "en" ? en : vi)[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match));
}

function journalTtl(now: number): number {
  const day = vnHour(now) >= 22 ? addDays(vnDay(now), 1) : vnDay(now);
  return Math.max(0, Math.floor((Date.parse(`${day}T22:00:00+07:00`) - now) / 1000));
}

export async function notifyJournal(env: Env, coupleId: string, authorId: string, now: number): Promise<void> {
  if (!env.VAPID_PRIVATE_KEY) { console.log("[bisou] push unavailable"); return; }
  try {
    const { results } = await env.DB.prepare(`SELECT s.id, s.endpoint, s.p256dh, s.auth, u.locale,
      (SELECT display_name FROM users WHERE id = ?) AS name
      FROM push_subscriptions s JOIN users u ON u.id = s.user_id
      WHERE s.user_id = (SELECT user_id FROM couple_members WHERE couple_id = ? AND user_id <> ?) AND s.journal = 1`)
      .bind(authorId, coupleId, authorId).all<PushRow & { locale: string; name: string | null }>();
    for (const row of results) {
      await sendPush(env, row, { title: translate(row.locale, "push.journal.one", { name: row.name ?? "" }), url: "/journal", tag: "journal" }, { ttl: journalTtl(now), topic: "journal" });
    }
  } catch { console.error("[bisou] journal push failed"); }
}
