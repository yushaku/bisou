import type { Wish } from "../../shared/types";
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
