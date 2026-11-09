// Local seed couple; never uses the regular .wrangler/state database.
import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const seedRoot = path.join(root, ".wrangler/stage-seed-v1");
const owner = "bisou-stage-seed-v1-local-only";
const port = Number(process.env.BISOU_DEV_PORT ?? 5191);
assert(Number.isInteger(port) && port >= 1024 && port <= 65535, "BISOU_DEV_PORT must be a local port from 1024 to 65535");
const prepareOnly = process.argv.includes("--prepare-only");

export const localCouple = { id: "local-an-binh", startDate: "2024-02-14", level: 1 };
export const localMembers = [
  { id: "local-an", email: "an@example.com", displayName: "An", locale: "vi" },
  { id: "local-binh", email: "binh@example.com", displayName: "Binh", locale: "en" },
];
const quote = (value) => value === null ? "NULL" : typeof value === "number" ? String(value) : "'" + value.replaceAll("'", "''") + "'";
export function seedSql(cards, existing, now) {
  const levels = ["acquainted", "in_love", "living_together", "married", "with_children"];
  const gates = (rank) => cards.filter((card) => card.kind === "decision" && card.levelId === levels[rank]).map((card) => card.id);
  const statements = [];
  function insert(table, row) {
    statements.push(`INSERT INTO ${table} (${Object.keys(row).join(",")}) VALUES (${Object.values(row).map(quote).join(",")});`);
  }
  if (existing.has(localCouple.id)) return { statements, fresh: false }; // Preserve manual answers and stage choices on rerun.
  for (const member of localMembers) {
    assert(member.email.endsWith("@example.com"));
    insert("users", { id: member.id, email: member.email, display_name: member.displayName, locale: member.locale, created_at: now });
  }
  insert("couples", { id: localCouple.id, start_date: localCouple.startDate, created_by: localMembers[0].id, created_at: now });
  localMembers.forEach((member) => insert("couple_members", { couple_id: localCouple.id, user_id: member.id, joined_at: now }));
  insert("garden_levels", { couple_id: localCouple.id, initial_level: localCouple.level, selected_level: localCouple.level,
    furthest_level: localCouple.level, revision: 0, proposal_kind: null, proposal_level: null, proposer_id: null,
    target_agreed: 0, gate_ids: JSON.stringify(gates(localCouple.level)) });
  return { statements, fresh: true };
}

export function prepareSeed(run = execFileSync, directory = seedRoot) {
  const persistence = path.join(directory, "state");
  const configPath = path.join(directory, "wrangler.json");
  const marker = path.join(directory, "seed-owner");
  if (existsSync(directory)) assert.equal(readFileSync(marker, "utf8"), owner, "Refusing an unowned persistence directory");
  mkdirSync(directory, { recursive: true });
  writeFileSync(marker, owner);
  const config = {
    name: "bisou-stage-seed", main: path.join(root, "src/worker/index.ts"),
    compatibility_date: "2026-11-01", compatibility_flags: ["nodejs_compat"],
    vars: { ENVIRONMENT: "development", OTP_PEPPER: "local-stage-seed-only-not-a-secret", DEV_LOGIN_CODE: "111111" },
    assets: { not_found_handling: "single-page-application", run_worker_first: ["/api/*"] },
    d1_databases: [{ binding: "DB", database_name: "bisou-stage-seed", database_id: "00000000-0000-0000-0000-000000005191", migrations_dir: path.join(root, "migrations") }],
    r2_buckets: [{ binding: "PHOTOS", bucket_name: "bisou-stage-seed" }],
  };
  assert.equal(config.vars.ENVIRONMENT, "development");
  assert(config.d1_databases.every((db) => db.database_name === "bisou-stage-seed" && !db.remote));
  writeFileSync(configPath, JSON.stringify(config, null, 2));
  const localEnv = { ...process.env, WRANGLER_SEND_METRICS: "false", CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false", WRANGLER_LOG_PATH: path.join(directory, "wrangler.log") };
  function wrangler(args) {
    assert(args.includes("--local") && !args.includes("--remote"), "Only local D1 operations are allowed");
    return run("pnpm", ["exec", "wrangler", ...args, "--config", configPath, "--persist-to", persistence], { cwd: root, env: localEnv, encoding: "utf8" });

}
const query = (sql) => JSON.parse(wrangler(["d1", "execute", "bisou-stage-seed", "--local", "--command", sql, "--json"]))[0].results;

wrangler(["d1", "migrations", "apply", "bisou-stage-seed", "--local"]);
console.log("Local seed database migrations are current");
const source = readFileSync(path.join(root, "src/shared/garden.ts"), "utf8");
const match = source.match(/export const CARDS: GardenCard\[\] = (\[[\s\S]*?\n\]);/);
assert(match, "Expected the existing static JSON card catalog");
const cards = JSON.parse(match[1]);
const levels = ["acquainted", "in_love", "living_together", "married", "with_children"];
const gates = (rank) => cards.filter((card) => card.kind === "decision" && card.levelId === levels[rank]).map((card) => card.id);

const existing = new Set(query("SELECT id FROM couples").map((row) => row.id));
const { statements, fresh } = seedSql(cards, existing, Date.now());
if (statements.length) {
  const sqlPath = path.join(directory, "seed.sql");
  writeFileSync(sqlPath, "BEGIN TRANSACTION;\n" + statements.join("\n") + "\nCOMMIT;\n");
  wrangler(["d1", "execute", "bisou-stage-seed", "--local", "--file", sqlPath]);
}
// Self-check: ownership, paired identities, placement state and a clean starting history.
const members = query(`SELECT u.id, u.email FROM users u JOIN couple_members m ON m.user_id = u.id WHERE m.couple_id = ${quote(localCouple.id)} ORDER BY u.id`);
assert.deepEqual(members.map((m) => m.email), localMembers.map((m) => m.email));
assert.equal(query(`SELECT COUNT(*) n FROM garden_levels WHERE couple_id = ${quote(localCouple.id)}`)[0].n, 1);
if (fresh) {
  const state = query(`SELECT * FROM garden_levels WHERE couple_id = ${quote(localCouple.id)}`)[0];
  assert.equal(state.initial_level, localCouple.level);
  assert.equal(state.selected_level, localCouple.level);
  assert.equal(state.furthest_level, localCouple.level);
  assert.deepEqual(JSON.parse(state.gate_ids), gates(localCouple.level));
  assert.equal(query(`SELECT COUNT(*) n FROM garden_answers WHERE couple_id = ${quote(localCouple.id)}`)[0].n, 0);
  assert.equal(query(`SELECT COUNT(*) n FROM garden_days WHERE couple_id = ${quote(localCouple.id)}`)[0].n, 0);
  assert.equal(query(`SELECT COUNT(*) n FROM garden_growth WHERE couple_id = ${quote(localCouple.id)}`)[0].n, 0);
}
console.log(`Seed self-check passed; local couple ${fresh ? "created" : "preserved"}; local DB: ${persistence}`);
for (const member of localMembers) console.log(`${member.displayName}: ${member.email}`);
return { configPath, persistence, localEnv };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    assert(process.argv.slice(2).every((arg) => arg === "--prepare-only"), "Only --prepare-only is supported");
    const { configPath, persistence, localEnv } = prepareSeed();
    if (!prepareOnly) {
      console.log(`Open http://127.0.0.1:${port}; request a code first, then use 111111; use separate browser profiles for A and B`);
      const server = spawn("pnpm", ["exec", "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
        cwd: root, env: { ...localEnv, BISOU_LOCAL_CONFIG: configPath, BISOU_LOCAL_STATE: persistence }, stdio: "inherit",
      });
      for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => server.kill(signal));
      server.on("exit", (code) => process.exit(code ?? 1));
      server.on("error", (error) => { console.error(error.message); process.exitCode = 1; });
    }
  } catch (error) {
    console.error(`Local Garden setup failed; dev server was not started: ${error.message}\nFix the reported migration/seed error and rerun pnpm dev; existing data was not reset`);
    process.exitCode = 1;
  }
}
