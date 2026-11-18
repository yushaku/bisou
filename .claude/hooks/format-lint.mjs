// Claude Code PostToolUse hook: format then lint-fix the edited file. Exit 2 shows remaining lint errors to the agent.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8"));
const file = input.tool_input?.file_path;
if (!file || !/\.(tsx?|[cm]?js|css|jsonc?)$/.test(file)) process.exit(0);

const run = (args) => spawnSync("pnpm", ["exec", ...args], { cwd: input.cwd ?? process.cwd(), encoding: "utf8" });

run(["prettier", "--write", "--ignore-unknown", file]);
const lint = run(["eslint", "--fix", "--no-warn-ignored", file]);
if (lint.status !== 0) {
  process.stderr.write(`${lint.stdout}${lint.stderr}`);
  process.exit(2);
}
