// Local synthetic Garden scenarios; never uses the regular .wrangler/state database.
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

export const scenarios = [
  { key: "placement", rank: null, target: 3, pending: true },
  { key: "reveal", rank: 1, target: null },
  { key: "unlock", rank: 1, target: 2 },
  { key: "skip", rank: 2, target: 4 },
];
const quote = (value) => value === null ? "NULL" : typeof value === "number" ? String(value) : "'" + value.replaceAll("'", "''") + "'";
export function seedSql(cards, existing, now) {
  const levels = ["acquainted", "in_love", "living_together", "married", "with_children"];
  const gates = (rank) => cards.filter((card) => card.kind === "decision" && card.levelId === levels[rank]).map((card) => card.id);
  const day = (offset = 0) => new Date(now + 7 * 3600000 + offset * 86400000).toISOString().slice(0, 10);

  const statements = [];
  function insert(table, row) {
    statements.push(`INSERT INTO ${table} (${Object.keys(row).join(",")}) VALUES (${Object.values(row).map(quote).join(",")});`);

}
const fresh = [];
for (const scenario of scenarios) {
  const { key, rank, target } = scenario;
  const couple = `seed-stage-${key}`;
  const ids = ["a", "b"].map((side) => `seed-stage-${key}-${side}`);
  if (existing.has(couple)) continue; // Preserve manual answers, deletions and stage choices on rerun.
  fresh.push(scenario);
  for (const [index, id] of ids.entries()) {
    const email = `${id}@example.com`;
    assert(email.endsWith("@example.com"));
    insert("users", { id, email, display_name: `Seed ${key} ${index ? "B" : "A"}`, locale: index ? "en" : "vi", created_at: now });
  }
  insert("couples", { id: couple, start_date: "2024-02-14", created_by: ids[0], created_at: now });
  ids.forEach((user_id) => insert("couple_members", { couple_id: couple, user_id, joined_at: now }));
  insert("garden_levels", { couple_id: couple, initial_level: rank, selected_level: rank, furthest_level: rank,
    revision: scenario.pending ? 1 : target === null ? 2 : 4,
    proposal_kind: scenario.pending ? "placement" : target === null ? null : "target",
    proposal_level: target, proposer_id: target === null ? null : ids[0], target_agreed: target !== null && !scenario.pending ? 1 : 0,
    gate_ids: JSON.stringify(rank === null ? [] : gates(rank)) });
  function answer(card_id, side, body, choice = null, flipped_day = null, edited_after_flip = 0) {
    insert("garden_answers", { couple_id: couple, card_id, user_id: ids[side], body, response_choice: choice,
      created_at: now - 86400000, updated_at: now - 86400000, flipped_day, edited_after_flip });
  }
  for (const side of [0, 1]) answer("money-01", side, side ? "Synthetic: I learned to save a little each week." : "Dữ liệu mẫu: nhà mình cùng ghi lại khoản chi.", null, day(-1));
  answer("money-02", 0, "Dữ liệu mẫu: câu trả lời riêng đang chờ người kia.");
  answer("money-04", 0, null, null, day(-1));
  answer("money-04", 1, "Synthetic edited response for history.", null, day(-1), 1);
  insert("garden_days", { couple_id: couple, day: day(-1), deck_id: "money", card_id: "money-01", swaps: 1,
    swapped_cards: JSON.stringify({ "money-03": `${day(-1)}:000000000001` }), flipped: 1, created_at: now - 86400000 });
  insert("garden_days", { couple_id: couple, day: day(), deck_id: "everyday", card_id: "everyday-01", created_at: now });
  for (const [deck_id, offsets] of [["money", [-3, -2, -1]], ["dreams", [-1]], ["everyday", [-2]]]) {
    for (const offset of offsets) insert("garden_growth", { couple_id: couple, deck_id, day: day(offset) });
  }
  if (key === "reveal") {
    answer("L2-01", 0, "Dữ liệu mẫu riêng: mình muốn chia tiền thuê nhà theo khả năng của mỗi đứa.");
    answer("L2-03", 0, null, "no_details", day(-1));
    answer("L2-03", 1, null, "later_not_applicable", day(-1));
    answer("L2-05", 0, "Dữ liệu mẫu: cùng chia việc nhà mỗi tuần.", null, day(-1));
    answer("L2-05", 1, null, "later_not_applicable", day(-1));
  }
  if (key === "unlock" || key === "skip") {
    const decisions = gates(rank);
    assert(decisions.length > 1);
    for (const [index, id] of decisions.entries()) {
      const last = index === decisions.length - 1;
      answer(id, 0, `Dữ liệu mẫu: đây là góc nhìn của A cho ${id}.`, null, last ? null : day(-1));
      if (!last) answer(id, 1, null, index % 2 ? "no_details" : "later_not_applicable", day(-1));
    }
  }
}
return { statements, fresh };
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
// Self-check: ownership, paired identities, gate snapshots and initial scenario boundaries.
for (const { key } of scenarios) {
  const couple = `seed-stage-${key}`;
  const members = query(`SELECT u.id, u.email FROM users u JOIN couple_members m ON m.user_id = u.id WHERE m.couple_id = ${quote(couple)} ORDER BY u.id`);
  assert.deepEqual(members.map((m) => m.email), ["a", "b"].map((side) => `${couple}-${side}@example.com`));
  assert.equal(query(`SELECT COUNT(*) n FROM garden_levels WHERE couple_id = ${quote(couple)}`)[0].n, 1);
  assert.equal(query(`SELECT COUNT(*) n FROM garden_growth WHERE couple_id = ${quote(couple)}`)[0].n >= 5, true);
}
for (const { key, rank } of fresh) {
  const couple = `seed-stage-${key}`;
  const state = query(`SELECT * FROM garden_levels WHERE couple_id = ${quote(couple)}`)[0];
  assert.equal(state.furthest_level, rank);
  assert.deepEqual(JSON.parse(state.gate_ids), rank === null ? [] : gates(rank));
  if (key === "unlock" || key === "skip") {
    const complete = query(`SELECT card_id FROM garden_answers WHERE couple_id = ${quote(couple)} AND flipped_day IS NOT NULL AND card_id LIKE 'L%' GROUP BY card_id HAVING COUNT(*) = 2`);
    assert.equal(complete.length, gates(rank).length - 1);
    assert.equal(state.target_agreed, 1);
  }
  if (key === "reveal") {
    assert.equal(query(`SELECT COUNT(*) n FROM garden_answers WHERE couple_id = ${quote(couple)} AND card_id = 'L2-01' AND flipped_day IS NULL`)[0].n, 1);
    assert.equal(query(`SELECT COUNT(*) n FROM garden_answers WHERE couple_id = ${quote(couple)} AND response_choice IS NOT NULL`)[0].n, 3);
  }
}
console.log(`Seed self-check passed; ${fresh.length} new couples, ${scenarios.length - fresh.length} preserved; local DB: ${persistence}`);
for (const scenario of scenarios) console.log(`${scenario.key}: seed-stage-${scenario.key}-a@example.com / seed-stage-${scenario.key}-b@example.com`);
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
