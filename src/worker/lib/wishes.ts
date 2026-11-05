import { SPIN_MAX_PER_DAY } from "../../shared/wishes";
import { DAY } from "./time";
import type { Claim, Wish } from "../../shared/types";
export { validateWish } from "../../shared/wishes";

export interface WishRow {
  id: string;
  title: string;
  price: number | null;
  link: string | null;
  priority: Wish["priority"];
  status: Wish["status"];
  received_on: string | null;
  note: string | null;
  created_at: number;
  updated_at: number;
  photo_id: string | null;
}

export const WISH_SELECT = "SELECT w.*, p.id AS photo_id FROM wishes w LEFT JOIN photos p ON p.wish_id = w.id";

export function toWish(row: WishRow): Wish {
  return { id: row.id, title: row.title, price: row.price, link: row.link, priority: row.priority,
    photoId: row.photo_id, status: row.status, receivedOn: row.received_on, note: row.note,
    createdAt: row.created_at, updatedAt: row.updated_at };
}

export function findWish(db: D1Database, id: string, owner: string, couple: string) {
  return db.prepare(`${WISH_SELECT} WHERE w.id = ? AND w.owner_id = ? AND w.couple_id = ?`)
    .bind(id, owner, couple).first<WishRow>();
}

export function randomInt(max: number): number {
  const range = 0x100000000;
  const limit = range - range % max;
  const value = new Uint32Array(1);
  do { crypto.getRandomValues(value); } while (value[0]! >= limit);
  return value[0]! % max;
}

export function pickWeighted<T extends { priority: number }>(rows: T[], draw = randomInt): T | null {
  if (!rows.length) return null;
  let remaining = draw(rows.reduce((sum, row) => sum + row.priority, 0));
  for (const row of rows) {
    remaining -= row.priority;
    if (remaining < 0) return row;
  }
  return null;
}

export async function reserveSpin(db: D1Database, userId: string, now: number): Promise<number | null> {
  const [, inserted, counted] = await db.batch([
    db.prepare("DELETE FROM wish_spins WHERE user_id = ? AND created_at <= ?").bind(userId, now - DAY),
    db.prepare("INSERT INTO wish_spins (user_id, created_at) VALUES (?, ?) RETURNING id").bind(userId, now),
    db.prepare("SELECT COUNT(*) AS n, MIN(created_at) AS oldest FROM wish_spins WHERE user_id = ?").bind(userId),
  ]);
  const id = (inserted!.results as { id: number }[])[0]!.id;
  const stats = (counted!.results as { n: number; oldest: number }[])[0]!;
  if (stats.n <= SPIN_MAX_PER_DAY) return null;
  await db.prepare("DELETE FROM wish_spins WHERE id = ?").bind(id).run();
  return Math.max(1, Math.ceil((stats.oldest + DAY - now) / 1000));
}

export interface ClaimRow {
  id: string;
  status: "open" | "received" | null;
  title: string | null;
  gone_title: string | null;
  price: number | null;
  link: string | null;
  photo_id: string | null;
  created_at: number;
}

export const CLAIM_SELECT = `SELECT c.id, c.gone_title, c.created_at, w.title, w.status, w.price, w.link, p.id AS photo_id
  FROM wish_claims c LEFT JOIN wishes w ON w.id = c.wish_id LEFT JOIN photos p ON p.wish_id = w.id`;

export function toClaim(row: ClaimRow): Claim {
  return { id: row.id, status: row.status ?? "gone", title: row.title ?? row.gone_title ?? "",
    price: row.price, link: row.link, photoId: row.photo_id, createdAt: row.created_at };
}
