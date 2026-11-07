import { en } from "../../client/i18n/en";
import { vi, type MessageKey } from "../../client/i18n/vi";
import { addDays, vnDay, vnHour } from "../../shared/days";
import type { Env } from "../env";
import { sendPush, type PushRow } from "./webpush";
import { HOUR } from "./time";

function translate(locale: string, key: MessageKey, vars: Record<string, string | number>): string {
  const text = (locale === "en" ? en : vi)[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match));
}

function journalTtl(now: number): number {
  const day = vnHour(now) >= 22 ? addDays(vnDay(now), 1) : vnDay(now);
  return Math.max(0, Math.floor((Date.parse(`${day}T22:00:00+07:00`) - now) / 1000));
}

export async function notifyJournal(env: Env, coupleId: string, authorId: string, now: number): Promise<void> {
  if (vnHour(now) >= 22 || vnHour(now) < 7) return;
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

export async function releaseNightJournal(env: Env, scheduledTime: number): Promise<void> {
  if (!env.VAPID_PRIVATE_KEY) { console.log("[bisou] push unavailable"); return; }
  const { results } = await env.DB.prepare("SELECT couple_id, author_id FROM journal_entries WHERE created_at >= ? AND created_at < ?")
    .bind(scheduledTime - 9 * HOUR, scheduledTime).all<{ couple_id: string; author_id: string }>();
  const authors = new Map<string, { coupleId: string; count: number }>();
  for (const row of results) {
    const author = authors.get(row.author_id);
    if (author) author.count++;
    else authors.set(row.author_id, { coupleId: row.couple_id, count: 1 });
  }
  const slot = vnDay(scheduledTime);
  let sent = 0;
  for (const [authorId, author] of authors) {
    const recipient = await env.DB.prepare(`SELECT u.id, u.locale, (SELECT display_name FROM users WHERE id = ?) AS name
      FROM couple_members m JOIN users u ON u.id = m.user_id WHERE m.couple_id = ? AND m.user_id <> ?`)
      .bind(authorId, author.coupleId, authorId).first<{ id: string; locale: string; name: string | null }>();
    if (!recipient) continue;
    const devices = await env.DB.prepare(`UPDATE push_subscriptions SET journal_slot = ?
      WHERE user_id = ? AND journal = 1 AND (journal_slot IS NULL OR journal_slot <> ?)
      RETURNING id, endpoint, p256dh, auth`).bind(slot, recipient.id, slot).all<PushRow>();
    const title = translate(recipient.locale, author.count === 1 ? "push.journal.one" : "push.journal.many", { name: recipient.name ?? "", n: author.count });
    for (const row of devices.results) {
      if (await sendPush(env, row, { title, url: "/journal", tag: "journal" }, { ttl: journalTtl(scheduledTime), topic: "journal" }) === "sent") sent++;
    }
  }
  console.log("[bisou] night journal pushes", sent);
}
