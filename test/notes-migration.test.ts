import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";

const migration = "0017_notes_closing_message.sql";
function beforeMigration() {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const file of readdirSync("migrations").filter(file => file.endsWith(".sql") && file < migration).sort()) db.exec(readFileSync(`migrations/${file}`, "utf8"));
  db.exec(`INSERT INTO users (id,email,created_at) VALUES ('a','a@example.com',1),('b','b@example.com',2);
    INSERT INTO couples (id,created_by,created_at) VALUES ('c','a',3);`);
  return db;
}
test("empty notes upgrade preserves indexes, foreign keys and invariants, and allows a message without pick", () => {
  const db = beforeMigration();
  try {
    const indexes = () => db.prepare("SELECT name,sql FROM sqlite_schema WHERE type='index' AND tbl_name='notes' ORDER BY name").all();
    const beforeIndexes = indexes().filter(row => row.name !== "notes_held");
    const foreignKeys = db.prepare("PRAGMA foreign_key_list(notes)").all();
    const journalKeys = db.prepare("PRAGMA foreign_key_list(journal_entries)").all();
    const triggers = db.prepare("SELECT name,sql FROM sqlite_schema WHERE type='trigger' ORDER BY name").all();
    db.exec("BEGIN");
    db.exec(readFileSync(`migrations/${migration}`, "utf8"));
    db.exec("COMMIT");
    expect(indexes()).toEqual(beforeIndexes);
    expect(db.prepare("PRAGMA foreign_key_list(notes)").all()).toEqual(foreignKeys);
    expect(db.prepare("PRAGMA foreign_key_list(journal_entries)").all()).toEqual(journalKeys);
    expect(db.prepare("SELECT name,sql FROM sqlite_schema WHERE type='trigger' ORDER BY name").all()).toEqual(triggers);
    expect(db.prepare("PRAGMA table_info(notes)").all().map(row => row.name)).not.toContain("pick");
    expect(db.prepare("PRAGMA table_info(notes)").all().map(row => row.name)).not.toContain("notified_at");
    const insert = db.prepare(`INSERT INTO notes (id,couple_id,writer_id,recipient_id,happened,feel,need,hope,created_at,updated_at)
      VALUES ('n','c','a','b','Chuyện đã xảy ra','Sad','Time','Talk',11,12)`);
    insert.run();
    for (const sql of [
      "UPDATE notes SET line='Reply' WHERE id='n'",
      "UPDATE notes SET reminded_at=30 WHERE id='n'",
      "UPDATE notes SET opened_at=30 WHERE id='n'",
      "UPDATE notes SET closed_at=40,line='Reply' WHERE id='n'",
      "UPDATE notes SET writer_id=recipient_id WHERE id='n'",
      "UPDATE notes SET hope='' WHERE id='n'",
    ]) expect(() => db.exec(sql)).toThrow();
    db.exec("UPDATE notes SET sent_at=20,opened_at=30 WHERE id='n'");
    expect(db.prepare("SELECT line FROM notes WHERE id='n'").get()).toEqual({ line: null });
    for (const line of ["''", "NULL"]) expect(() => db.exec(`UPDATE notes SET closed_at=40,line=${line} WHERE id='n'`)).toThrow();
    db.exec("UPDATE notes SET closed_at=40,line='My own reply' WHERE id='n'");
    expect(db.prepare("SELECT line FROM notes WHERE id='n'").get()).toEqual({ line: "My own reply" });
    expect(() => db.exec("UPDATE notes SET line=NULL WHERE id='n'")).toThrow();
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally { db.close(); }
});
test("non-empty notes abort the migration before dropping any rows, links or indexes", () => {
  const db = beforeMigration();
  try {
    db.exec(`INSERT INTO notes (id,couple_id,writer_id,recipient_id,happened,feel,need,hope,pick,line,created_at,updated_at,sent_at,opened_at,closed_at)
      VALUES ('n','c','a','b','H','F','N','R','talk','Reply',1,2,3,4,5);
      INSERT INTO journal_entries (id,couple_id,author_id,entry_date,note_id,created_at,updated_at) VALUES ('j','c','a','2026-11-17','n',5,6);
      INSERT INTO photos (id,couple_id,uploader_id,entry_id,position,created_at) VALUES ('p','c','a','j',0,7);`);
    const snapshot = () => ({ schema: db.prepare("SELECT * FROM sqlite_schema ORDER BY name").all(), notes: db.prepare("SELECT * FROM notes").all(), journal: db.prepare("SELECT * FROM journal_entries").all(), photos: db.prepare("SELECT * FROM photos").all() });
    const before = snapshot();
    db.exec("BEGIN");
    expect(() => db.exec(readFileSync(`migrations/${migration}`, "utf8"))).toThrow(/CHECK/);
    db.exec("ROLLBACK");
    expect(snapshot()).toEqual(before);
    expect(db.prepare("PRAGMA foreign_key_check").all()).toEqual([]);
  } finally { db.close(); }
});

test("a linked journal row also prevents the empty-note upgrade", () => {
  const db = beforeMigration();
  try {
    db.exec("PRAGMA foreign_keys = OFF");
    db.exec("INSERT INTO journal_entries (id,couple_id,author_id,entry_date,note_id,created_at,updated_at) VALUES ('j','c','a','2026-11-17','missing',1,2)");
    db.exec("PRAGMA foreign_keys = ON");
    db.exec("BEGIN");
    expect(() => db.exec(readFileSync(`migrations/${migration}`, "utf8"))).toThrow(/CHECK/);
    db.exec("ROLLBACK");
    expect(db.prepare("SELECT note_id FROM journal_entries WHERE id='j'").get()).toEqual({ note_id: "missing" });
  } finally { db.close(); }
});
