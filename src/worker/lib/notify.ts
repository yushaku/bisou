import { en } from "../../client/i18n/en";
import { vi, type MessageKey } from "../../client/i18n/vi";
import { addDays, vnDay, vnHour } from "../../shared/days";
import { eventTitle, upcomingEvents } from "../../shared/events";
import { isLocale, type Couple, type Locale } from "../../shared/types";
import type { Env } from "../env";
import { MAX_PUSH_PLAINTEXT, type PushMessage } from "./webpush";
import { enqueuePush, pushJob, type PushJob } from "./pushQueue";
import { loadCouple } from "./couples";

function translate(locale: string, key: MessageKey, vars: Record<string, string | number> = {}): string {
  const text = (locale === "en" ? en : vi)[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) => String(vars[name] ?? match));
}

// Every push lives 24 hours (see pushJob); there are no quiet hours. Sending happens in the queue consumer (ADR 0010).

export async function notifyJournal(env: Env, coupleId: string, authorId: string): Promise<void> {
  if (!env.VAPID_PRIVATE_KEY) { console.log("[bisou] push unavailable"); return; }
  try {
    const { results } = await env.DB.prepare(`SELECT s.id, u.locale,
      (SELECT display_name FROM users WHERE id = ?) AS name
      FROM push_subscriptions s JOIN users u ON u.id = s.user_id
      WHERE s.user_id = (SELECT user_id FROM couple_members WHERE couple_id = ? AND user_id <> ?) AND s.journal = 1`)
      .bind(authorId, coupleId, authorId).all<{ id: string; locale: string; name: string | null }>();
    const now = Date.now();
    await enqueuePush(env, results.map((row) => pushJob(row.id, "journal",
      { title: translate(row.locale, "push.journal.one", { name: row.name ?? "" }), url: "/journal", tag: "journal" }, now)));
  } catch { console.error("[bisou] journal push failed"); }
}

export async function notifyGarden(env: Env, coupleId: string, authorId: string): Promise<void> {
  if (!env.VAPID_PRIVATE_KEY) { console.log("[bisou] push unavailable"); return; }
  try {
    const { results } = await env.DB.prepare(`SELECT s.id, u.locale
      FROM push_subscriptions s JOIN users u ON u.id = s.user_id
      WHERE s.user_id = (SELECT user_id FROM couple_members WHERE couple_id = ? AND user_id <> ?) AND s.journal = 1`)
      .bind(coupleId, authorId).all<{ id: string; locale: string }>();
    const now = Date.now();
    await enqueuePush(env, results.map((row) => pushJob(row.id, "garden",
      { title: translate(row.locale, "push.garden.answered"), url: "/", tag: "garden" }, now)));
  } catch { console.error("[bisou] garden push failed"); }
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
  const jobs: PushJob[] = [];
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
        RETURNING id`).bind(slot, userId, slot).all<{ id: string }>();
      for (const row of devices.results) jobs.push(pushJob(row.id, "events", message));
    } catch { console.error("[bisou] push failed", "events", 0); }
  }
  await enqueuePush(env, jobs);
  console.log("[bisou] event pushes queued", jobs.length);
}

async function pushNotesToRecipient(env: Env, writer: string, recipient: string, count: number, reminder: boolean): Promise<void> {
  const { results } = await env.DB.prepare(`SELECT s.id, u.locale,
    (SELECT display_name FROM users WHERE id = ?) AS name
    FROM push_subscriptions s JOIN users u ON u.id = s.user_id WHERE s.user_id = ? AND s.journal = 1`)
    .bind(writer, recipient).all<{ id: string; locale: string; name: string | null }>();
  const now = Date.now();
  const jobs = results.map((row) => {
    const name = row.name?.trim() || translate(row.locale, "common.person");
    const key = reminder ? count === 1 ? "push.notes.reminder" : "push.notes.reminders" : "push.notes.one";
    return pushJob(row.id, "notes", { title: translate(row.locale, key, { name, n: count }), url: "/journal?section=notes", tag: "notes" }, now);
  });
  await enqueuePush(env, jobs);
  console.log("[bisou] note pushes queued", jobs.length);
}
export async function notifyNote(env: Env, writer: string, recipient: string): Promise<void> {
  if (!env.VAPID_PRIVATE_KEY) return;
  await pushNotesToRecipient(env, writer, recipient, 1, false);
}
export const REMIND_NOTES_SQL = "UPDATE notes SET reminded_at = ? WHERE reminded_at IS NULL AND opened_at IS NULL AND sent_at < ? RETURNING recipient_id, writer_id";
// 07:00: one reminder per unopened note three Vietnam days after delivery; reminders due together for one writer combine.
export async function remindNotes(env: Env, scheduledTime: number): Promise<void> {
  if (!env.VAPID_PRIVATE_KEY) return;
  const cut = Date.parse(`${addDays(vnDay(scheduledTime), -2)}T00:00:00+07:00`);
  const { results } = await env.DB.prepare(REMIND_NOTES_SQL).bind(scheduledTime, cut).all<{ recipient_id: string; writer_id: string }>();
  const groups = new Map<string, { writer: string; count: number }>();
  for (const row of results) {
    const group = groups.get(row.recipient_id);
    if (group) group.count++; else groups.set(row.recipient_id, { writer: row.writer_id, count: 1 });
  }
  for (const [recipient, group] of groups) {
    try { await pushNotesToRecipient(env, group.writer, recipient, group.count, true); }
    catch { console.error("[bisou] note push failed"); }
  }
}
