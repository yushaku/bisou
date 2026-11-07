import { en } from "../../client/i18n/en";
import { vi, type MessageKey } from "../../client/i18n/vi";
import { addDays, vnDay, vnHour } from "../../shared/days";
import { eventTitle, upcomingEvents } from "../../shared/events";
import { isLocale, type Couple, type Locale } from "../../shared/types";
import type { Env } from "../env";
import { MAX_PUSH_PLAINTEXT, sendPush, type PushMessage, type PushRow } from "./webpush";
import { HOUR } from "./time";
import { loadCouple } from "./couples";

function translate(locale: string, key: MessageKey, vars: Record<string, string | number> = {}): string {
  const text = (locale === "en" ? en : vi)[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match));
}

function pushTtl(now: number): number {
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
      try { await sendPush(env, row, { title: translate(row.locale, "push.journal.one", { name: row.name ?? "" }), url: "/journal", tag: "journal" }, { ttl: pushTtl(now), topic: "journal" }); } catch { console.error("[bisou] push failed", "journal", 0); }
    }
  } catch { console.error("[bisou] journal push failed"); }
}

export async function notifyGarden(env: Env, coupleId: string, now: number): Promise<void> {
  if (vnHour(now) >= 22 || vnHour(now) < 7) return;
  if (!env.VAPID_PRIVATE_KEY) { console.log("[bisou] push unavailable"); return; }
  try {
    const { results } = await env.DB.prepare(`SELECT s.id, s.endpoint, s.p256dh, s.auth, u.locale
      FROM push_subscriptions s JOIN users u ON u.id = s.user_id
      JOIN couple_members m ON m.user_id = s.user_id WHERE m.couple_id = ? AND s.journal = 1`)
      .bind(coupleId).all<PushRow & { locale: string }>();
    for (const row of results) {
      try { await sendPush(env, row, { title: translate(row.locale, "push.garden"), url: "/garden", tag: "garden" }, { ttl: pushTtl(now), topic: "garden" }); }
      catch { console.error("[bisou] push failed", "garden", 0); }
    }
  } catch { console.error("[bisou] garden push failed"); }
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
    try {
      const recipient = await env.DB.prepare(`SELECT u.id, u.locale, (SELECT display_name FROM users WHERE id = ?) AS name
        FROM couple_members m JOIN users u ON u.id = m.user_id WHERE m.couple_id = ? AND m.user_id <> ?`)
        .bind(authorId, author.coupleId, authorId).first<{ id: string; locale: string; name: string | null }>();
      if (!recipient) continue;
      const devices = await env.DB.prepare(`UPDATE push_subscriptions SET journal_slot = ?
        WHERE user_id = ? AND journal = 1 AND (journal_slot IS NULL OR journal_slot <> ?)
        RETURNING id, endpoint, p256dh, auth`).bind(slot, recipient.id, slot).all<PushRow>();
      const title = translate(recipient.locale, author.count === 1 ? "push.journal.one" : "push.journal.many", { name: recipient.name ?? "", n: author.count });
      for (const row of devices.results) {
        try { if (await sendPush(env, row, { title, url: "/journal", tag: "journal" }, { ttl: pushTtl(scheduledTime), topic: "journal" }) === "sent") sent++; } catch { console.error("[bisou] push failed", "journal", 0); }
      }
    } catch { console.error("[bisou] push failed", "journal", 0); }
  }
  console.log("[bisou] night journal pushes", sent);
}

export function reminderMessage(titles: string[], locale: Locale, offset: 0 | 1): PushMessage {
  for (let count = Math.min(3, titles.length); count >= 0; count--) {
    const names = titles.slice(0, count);
    if (count < titles.length) names.push(translate(locale, "push.events.more", { n: titles.length - count }));
    const conjunction = count < titles.length ? " " : locale === "vi" ? " và " : " and ";
    const events = names.length < 2 ? names.join("") : names.slice(0, -1).join(", ") + conjunction + names.at(-1);
    const message = {
      title: translate(locale, offset ? "push.events.tomorrow" : "push.events.today", { events }),
      url: "/events", tag: "events",
    };
    if (new TextEncoder().encode(JSON.stringify(message)).length <= MAX_PUSH_PLAINTEXT) return message;
  }
  throw new Error("push summary too large");
}

export async function remindEvents(env: Env, scheduledTime: number, offset: 0 | 1): Promise<void> {
  if (!env.VAPID_PRIVATE_KEY) { console.log("[bisou] push unavailable"); return; }
  const { results } = await env.DB.prepare(`SELECT s.user_id, u.locale FROM push_subscriptions s
    JOIN users u ON u.id = s.user_id WHERE s.reminders = 1`).all<{ user_id: string; locale: string }>();
  const recipients = new Map(results.map((row) => [row.user_id, row.locale]));
  const couples = new Map<string, Couple | null>();
  const today = vnDay(scheduledTime);
  const target = addDays(today, offset);
  const slot = `${today}T${String(vnHour(scheduledTime)).padStart(2, "0")}`;
  let sent = 0;
  // shortcut: sends share one invocation, move to Queues before about 40 devices per run.
  for (const [userId, rawLocale] of recipients) {
    try {
      let couple = couples.get(userId);
      if (couple === undefined) {
        couple = await loadCouple(env.DB, userId, scheduledTime);
        couples.set(userId, couple);
        for (const member of couple?.members ?? []) couples.set(member.id, couple);
      }
      if (couple?.members.length !== 2) continue;
      const locale = isLocale(rawLocale) ? rawLocale : "vi";
      const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
      const partner = couple.members.find((member) => member.id !== userId)!;
      const titles = upcomingEvents(couple.startDate, [{ name: partner.displayName?.trim() || t("common.person"), birthDate: partner.birthDate }], today, couple.events)
        .filter((event) => event.date === target).map((event) => eventTitle(event, t, locale));
      if (!titles.length) continue;
      const message = reminderMessage(titles, locale, offset);
      const devices = await env.DB.prepare(`UPDATE push_subscriptions SET reminder_slot = ?
        WHERE user_id = ? AND reminders = 1 AND (reminder_slot IS NULL OR reminder_slot <> ?)
        RETURNING id, endpoint, p256dh, auth`).bind(slot, userId, slot).all<PushRow>();
      for (const row of devices.results) {
        try { if (await sendPush(env, row, message, { ttl: pushTtl(scheduledTime), topic: "events" }) === "sent") sent++; } catch { console.error("[bisou] push failed", "events", 0); }
      }
    } catch { console.error("[bisou] push failed", "events", 0); }
  }
  console.log("[bisou] event pushes", sent);
}
