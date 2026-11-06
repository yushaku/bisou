import { isLocale, type Locale, type User } from "../../shared/types";
import type { Env } from "../env";

export interface UserRow {
  id: string;
  email: string;
  display_name: string | null;
  birth_date: string | null;
  avatar_id: string | null;
  locale: string;
  created_at: number;
}

export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    birthDate: row.birth_date,
    avatarId: row.avatar_id,
    locale: isLocale(row.locale) ? row.locale : "vi",
    createdAt: row.created_at,
  };
}

export async function findOrCreateUser(env: Env, email: string, locale: Locale, now = Date.now()): Promise<User> {
  // INSERT OR IGNORE keeps this safe when two verifications race for a new address.
  await env.DB.prepare(
    "INSERT OR IGNORE INTO users (id, email, display_name, locale, created_at) VALUES (?, ?, NULL, ?, ?)",
  )
    .bind(crypto.randomUUID(), email, locale, now)
    .run();
  const row = await env.DB.prepare("SELECT id, email, display_name, locale, birth_date, avatar_id, created_at FROM users WHERE email = ?")
    .bind(email)
    .first<UserRow>();
  if (!row) throw new Error("user row missing after insert");
  return rowToUser(row);
}
