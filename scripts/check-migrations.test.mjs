import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { detectDestructiveSql, parsePendingMigrations } from "./check-migrations.mjs";

test("reports destructive statements with their source lines", () => {
  const sql = `-- header
DROP TABLE users;
drop index sessions_user_id;
ALTER TABLE users DROP COLUMN email;
DELETE /* all rows */ FROM sessions;
UPDATE users SET email = 'x';
ALTER TABLE users RENAME TO people;
ALTER TABLE users RENAME COLUMN email TO address;`;
  assert.deepEqual(detectDestructiveSql(sql).map(({ line }) => line), [2, 3, 4, 5, 6, 7, 8]);
});

test("allows additive SQL, comments, quoted keywords and filtered updates", () => {
  assert.deepEqual(detectDestructiveSql(`
    -- DROP TABLE users;
    /* DELETE FROM users; */
    CREATE TABLE fresh (id INTEGER, "UPDATE" TEXT DEFAULT 'DROP TABLE users;');
    CREATE INDEX fresh_id ON fresh (id);
    DROP INDEX fresh_id;
    ALTER TABLE users ADD COLUMN note TEXT;
    UPDATE users SET note = 'it''s WHERE; DELETE FROM users' WHERE id = 1;
    CREATE TABLE child (id REFERENCES fresh(id) ON UPDATE CASCADE);
    CREATE TRIGGER audit AFTER UPDATE ON users BEGIN INSERT INTO fresh (id) VALUES (1); END;
  `), []);
});

test("WHERE inside strings, comments, identifiers or subqueries does not filter an UPDATE", () => {
  for (const sql of [
    "UPDATE users SET note = 'WHERE';",
    "UPDATE users SET note = 1 /* WHERE id = 1 */;",
    'UPDATE users SET "WHERE" = 1;',
    "UPDATE users SET note = (SELECT id FROM other WHERE id = 1);",
    "WITH chosen AS (SELECT id FROM users WHERE id = 1) UPDATE users SET note = 1;",
  ]) assert.equal(detectDestructiveSql(sql).length, 1, sql);
});

test("checks multiline SQL, optional COLUMN, conflict clauses and trigger bodies", () => {
  for (const sql of [
    "DROP\n/* comment */ TABLE users;",
    "ALTER TABLE users DROP email;",
    "UPDATE OR REPLACE users SET note = 1;",
    "CREATE TRIGGER cleanup AFTER INSERT ON users BEGIN DELETE FROM sessions; END;",
  ]) assert.equal(detectDestructiveSql(sql).length, 1, sql);
});

test("allows dropping an index only when its table is definitely created earlier in this file", () => {
  assert.deepEqual(detectDestructiveSql('CREATE TABLE "Fresh" (id); CREATE INDEX "Ix" ON "fresh" (id); DROP INDEX IF EXISTS "ix";'), []);
  for (const sql of [
    "CREATE INDEX ix ON users (id); DROP INDEX ix;",
    "CREATE TABLE IF NOT EXISTS users (id); CREATE INDEX ix ON users (id); DROP INDEX ix;",
    "CREATE TABLE fresh (id); CREATE INDEX IF NOT EXISTS ix ON fresh (id); DROP INDEX ix;",
    "DROP INDEX ix; CREATE TABLE fresh (id); CREATE INDEX ix ON fresh (id);",
    "CREATE TABLE fresh (id); DROP INDEX unknown;",
  ]) assert.equal(detectDestructiveSql(sql).length, 1, sql);
});

const listing = "Wrangler banner\nMigrations to be applied:\n┌────────────────┐\n│ Name           │\n├────────────────┤\n│ 0001_auth.sql  │\n│ 0002_safe.sql  │\n└────────────────┘\n";

test("parses Wrangler tables with ANSI colors and CRLF", () => {
  assert.deepEqual(parsePendingMigrations(`\u001b[32m${listing}\u001b[0m`.replaceAll("\n", "\r\n")), ["0001_auth.sql", "0002_safe.sql"]);
  assert.deepEqual(parsePendingMigrations("✅ No migrations to apply!\n"), []);
});

test("fails closed on empty, changed, truncated, unsafe or contradictory listings", () => {
  for (const output of ["", "some error", "Migrations to be applied:", listing.replace("0002_safe.sql", "../unsafe.sql"), listing.replace("0002_safe.sql", "invalid"), listing.replace("└────────────────┘", ""), listing + "No migrations to apply!\n"]) {
    assert.throws(() => parsePendingMigrations(output), /migration/i);
  }
});

test("fixture CLI checks only pending files and fails with file and line before any remote call", () => {
  const dir = mkdtempSync(join(tmpdir(), "bisou-migrations-"));
  try {
    writeFileSync(join(dir, "pending.txt"), listing);
    writeFileSync(join(dir, "0001_auth.sql"), "CREATE TABLE fresh (id INTEGER);");
    writeFileSync(join(dir, "0002_safe.sql"), "-- header\nDELETE FROM users;");
    writeFileSync(join(dir, "0000_applied.sql"), "DROP TABLE users;");
    const run = () => spawnSync(process.execPath, ["scripts/check-migrations.mjs", "--fixture", join(dir, "pending.txt"), dir], { encoding: "utf8" });
    const blocked = run();
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /0002_safe.sql:2: DELETE FROM/);
    writeFileSync(join(dir, "0002_safe.sql"), "CREATE INDEX fresh_id ON fresh (id);");
    const safe = run();
    assert.equal(safe.status, 0, safe.stderr);
    assert.match(safe.stdout, /Checked 2 pending migrations/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
