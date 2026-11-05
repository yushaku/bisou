import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

export function parsePendingMigrations(output) {
  const text = stripVTControlCharacters(output).replaceAll("\r", "");
  const marker = "Migrations to be applied:";
  const empty = /^(?:✅\s*)?No migrations to apply!\s*$/m.test(text);
  if (empty && !text.includes(marker)) return [];
  const table = text.split(marker);
  if (empty || table.length !== 2) throw new Error("Unrecognized migration listing");
  const lines = table[1].trim().split("\n").map((line) => line.trim());
  const end = lines.findIndex((line) => /^└─+┘$/.test(line));
  if (!/^┌─+┐$/.test(lines[0]) || end < 3 || !/^│\s*Name\s*│$/.test(lines[1])) {
    throw new Error("Incomplete migration table");
  }
  const names = [];
  for (const line of lines.slice(2, end)) {
    if (/^├─+┤$/.test(line)) continue;
    const row = /^│\s*([\w-]+\.sql)\s*│$/.exec(line);
    if (!row) throw new Error(`Invalid migration row: ${line}`);
    names.push(row[1]);
  }
  if (!names.length || new Set(names).size !== names.length) throw new Error("Invalid migration names");
  return names;
}

function tokenize(sql) {
  const tokens = [];
  let line = 1;
  // Keep quoted names distinct from keywords, and preserve newlines in comments and strings.
  const pattern = /--[^\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'|"(?:""|[^"])*"|`(?:``|[^`])*`|\[[^\]]*\]|[\p{L}\p{N}_$]+|\s+|./gu;
  for (const [text] of sql.matchAll(pattern)) {
    if (!/^\s|^--|^\/\*/.test(text)) {
      const quoted = /^["`\[]/.test(text);
      const name = quoted ? text.slice(1, -1).replace(/""/g, '"').replace(/``/g, "`") : text;
      tokens.push({ word: quoted || text.startsWith("'") ? "" : text.toUpperCase(), name: name.toLowerCase(), line });
    }
    line += (text.match(/\n/g) ?? []).length;
  }
  return tokens;
}

function identifier(tokens, start) {
  if (tokens[start + 1]?.word === ".") {
    return { name: `${tokens[start]?.name}.${tokens[start + 2]?.name}`, end: start + 3 };
  }
  return { name: `main.${tokens[start]?.name}`, end: start + 1 };
}

export function detectDestructiveSql(sql) {
  const tokens = tokenize(sql);
  const findings = [];
  const tables = new Set();
  const indexes = new Map();
  for (let start = 0; start < tokens.length;) {
    let end = start;
    while (end < tokens.length && tokens[end].word !== ";") end++;
    const statement = tokens.slice(start, end);
    const words = statement.map((token) => token.word);
    if (words[0] === "CREATE" && words[1] === "TABLE" && words[2] !== "IF") {
      tables.add(identifier(statement, 2).name);
    }
    const indexAt = words[1] === "UNIQUE" ? 2 : 1;
    if (words[0] === "CREATE" && words[indexAt] === "INDEX" && words[indexAt + 1] !== "IF") {
      const index = identifier(statement, indexAt + 1);
      if (words[index.end] === "ON") indexes.set(index.name, identifier(statement, index.end + 1).name);
    }
    for (let i = 0; i < words.length; i++) {
      let reason;
      if (words[i] === "DROP" && words[i + 1] === "TABLE") reason = "DROP TABLE";
      if (words[i] === "DELETE" && words[i + 1] === "FROM") reason = "DELETE FROM";
      if (words[i] === "DROP" && words[i + 1] === "INDEX") {
        const index = identifier(statement, i + (words[i + 2] === "IF" ? 4 : 2));
        if (!tables.has(indexes.get(index.name))) reason = "DROP INDEX on an existing or unknown table";
      }
      if (words[i] === "ALTER" && words[i + 1] === "TABLE") {
        const table = identifier(statement, i + 2);
        if (words[table.end] === "DROP") reason = "DROP COLUMN";
        if (words[table.end] === "RENAME") reason = "ALTER TABLE RENAME";
      }
      if (words[i] === "UPDATE" && !["ON", "DO"].includes(words[i - 1]) && !["OF", "ON"].includes(words[i + 1])) {
        let depth = 0;
        let filtered = false;
        for (const word of words.slice(i + 1)) {
          if (word === "(") depth++;
          if (word === ")") depth--;
          if (word === "WHERE" && depth === 0) filtered = true;
        }
        if (!filtered) reason = "UPDATE without WHERE";
      }
      if (reason) findings.push({ line: statement[i].line, reason });
    }
    start = end + 1;
  }
  return findings;
}

function main(args) {
  const fixture = args[0] === "--fixture" && args.length === 3;
  if (args.length && !fixture) throw new Error("Usage: node scripts/check-migrations.mjs [--fixture listing.txt migrations-dir]");
  const output = fixture ? readFileSync(args[1], "utf8") : execFileSync("pnpm", [
    "exec", "wrangler", "d1", "migrations", "list", "bisou", "--remote", "--config", "wrangler.jsonc",
  ], { encoding: "utf8", env: { ...process.env, CI: "true", NO_COLOR: "1" }, stdio: ["ignore", "pipe", "inherit"] });
  const names = parsePendingMigrations(output);
  const violations = [];
  for (const name of names) {
    const path = join(fixture ? args[2] : "migrations", name);
    for (const { line, reason } of detectDestructiveSql(readFileSync(path, "utf8"))) {
      violations.push(`${path}:${line}: ${reason}`);
    }
  }
  if (violations.length) throw new Error(`${violations.join("\n")}\nDestructive migrations require PO review; nothing was applied`);
  console.log(`Checked ${names.length} pending migrations: ${names.join(", ") || "none"}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
