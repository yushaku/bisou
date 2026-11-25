import type { SharedWish } from "../../shared/types";

export interface SharedWishRow {
  id: string;
  creator_id: string;
  title: string;
  price: number | null;
  link: string | null;
  status: SharedWish["status"];
  done_on: string | null;
  note: string | null;
  created_at: number;
  updated_at: number;
  photo_id: string | null;
}

export const SHARED_WISH_SELECT =
  "SELECT w.*, p.id AS photo_id FROM shared_wishes w LEFT JOIN photos p ON p.shared_wish_id = w.id";

export function toSharedWish(row: SharedWishRow): SharedWish {
  return {
    id: row.id,
    creatorId: row.creator_id,
    title: row.title,
    price: row.price,
    link: row.link,
    photoId: row.photo_id,
    status: row.status,
    doneOn: row.done_on,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function findSharedWish(db: D1Database, id: string, couple: string) {
  return db.prepare(`${SHARED_WISH_SELECT} WHERE w.id = ? AND w.couple_id = ?`).bind(id, couple).first<SharedWishRow>();
}
