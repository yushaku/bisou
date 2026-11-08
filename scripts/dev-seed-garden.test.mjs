import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { prepareSeed } from "./dev-seed-garden.mjs";

const migrations = readdirSync(new URL("../migrations/", import.meta.url)).filter((name) => name.endsWith(".sql")).sort();

test("local startup applies missing migrations before seeding, preserves mutations on rerun, and applies future additive migrations", () => {
  const parent = mkdtempSync(path.join(tmpdir(), "bisou-seed-check-"));
  const directory = path.join(parent, "seed");
  const db = new DatabaseSync(":memory:");
  const applied = new Set();
  const pending = migrations.map((name) => ({ name, sql: readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8") }));
  // An older local database already has the first eleven migrations and unrelated synthetic data.
  for (const migration of pending.slice(0, 11)) { db.exec(migration.sql); applied.add(migration.name); }
  db.exec("INSERT INTO users(id,email,display_name,created_at) VALUES ('unrelated','unrelated@example.com','Keep me',1)");
  let migrationCalls = 0;
  let inserts = 0;
  const runner = (_cmd, args) => {
    assert(args.includes("--local")); assert(!args.includes("--remote"));
    assert.equal(args[args.indexOf("--persist-to") + 1], path.join(directory, "state"));
    const config = JSON.parse(readFileSync(args[args.indexOf("--config") + 1], "utf8"));
    assert.equal(config.d1_databases[0].database_name, "bisou-stage-seed");
    if (args.includes("migrations")) {
      migrationCalls++;
      for (const migration of pending) if (!applied.has(migration.name)) { db.exec(migration.sql); applied.add(migration.name); }
      return "";
    }
    if (args.includes("--file")) { inserts++; db.exec(readFileSync(args[args.indexOf("--file") + 1], "utf8")); return ""; }
    return JSON.stringify([{ results: db.prepare(args[args.indexOf("--command") + 1]).all() }]);
  };
  try {
    prepareSeed(runner, directory);
    assert.equal(applied.size, migrations.length); assert.equal(db.prepare("SELECT COUNT(*) n FROM couple_members").get().n, 8);
    db.exec("UPDATE garden_levels SET revision=9, proposal_kind=NULL, proposal_level=NULL, proposer_id=NULL, target_agreed=0 WHERE couple_id='seed-stage-unlock'");
    db.exec("DELETE FROM garden_answers WHERE couple_id='seed-stage-unlock' AND card_id='L2-19'");
    db.exec("UPDATE garden_answers SET body='PO edited this' WHERE couple_id='seed-stage-reveal' AND card_id='L2-01'");
    pending.push({ name: "future_additive", sql: "ALTER TABLE users ADD COLUMN seed_check_future TEXT" });
    prepareSeed(runner, directory);
    assert.equal(migrationCalls, 2); assert.equal(inserts, 1); assert(applied.has("future_additive"));
    assert.equal(db.prepare("SELECT revision FROM garden_levels WHERE couple_id='seed-stage-unlock'").get().revision, 9);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM garden_answers WHERE couple_id='seed-stage-unlock' AND card_id='L2-19'").get().n, 0);
    assert.equal(db.prepare("SELECT body FROM garden_answers WHERE couple_id='seed-stage-reveal' AND card_id='L2-01'").get().body, "PO edited this");
    assert.equal(db.prepare("SELECT display_name FROM users WHERE id='unrelated'").get().display_name, "Keep me");
    assert.equal(db.prepare("SELECT COUNT(*) n FROM users").get().n, 9);
  } finally { db.close(); rmSync(parent, { recursive: true }); }
});

test("migration/seed failures stop preparation; a seed transaction never leaves a partial couple", () => {
  const parent = mkdtempSync(path.join(tmpdir(), "bisou-seed-fail-"));
  const directory = path.join(parent, "seed");
  try {
    let calls = 0;
    assert.throws(() => prepareSeed(() => { calls++; throw new Error("synthetic migration failure"); }, directory), /synthetic migration failure/);
    assert.equal(calls, 1);
    const db = new DatabaseSync(":memory:");
    try {
      const runner = (_cmd, args) => {
        if (args.includes("migrations")) { for (const name of migrations) db.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8")); return ""; }
        if (args.includes("--file")) {
          const sql = readFileSync(args[args.indexOf("--file") + 1], "utf8").replace("COMMIT;", "INSERT INTO nonexistent VALUES (1); COMMIT;");
          try { db.exec(sql); } catch (error) { db.exec("ROLLBACK"); throw error; }
        }
        return JSON.stringify([{ results: db.prepare(args[args.indexOf("--command") + 1]).all() }]);
      };
      assert.throws(() => prepareSeed(runner, directory), /nonexistent/);
      assert.equal(db.prepare("SELECT COUNT(*) n FROM couples").get().n, 0);
      assert.equal(db.prepare("SELECT COUNT(*) n FROM users").get().n, 0);
    } finally { db.close(); }
  } finally { rmSync(parent, { recursive: true }); }
});

test("dev entry point refuses remote or arbitrary target arguments before setup", () => {
  const result = spawnSync(process.execPath, [new URL("./dev-seed-garden.mjs", import.meta.url).pathname, "--remote"], { encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Only --prepare-only is supported/);
  assert.match(result.stderr, /dev server was not started/);
});
