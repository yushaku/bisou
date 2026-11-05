// Dev server reachable from a phone: Vite on a local port plus a cloudflared quick tunnel (https, no account).
// Usage: pnpm dev:phone [port]   (default port 5180). Ctrl+C stops both.
import { spawn } from "node:child_process";

const port = process.argv[2] ?? "5180";
const children = [];

function start(cmd, args) {
  const child = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  child.on("exit", (code) => {
    console.log(`[dev:phone] ${cmd} exited (${code ?? "signal"}), stopping`);
    stop(code ?? 0);
  });
  return child;
}

function stop(code = 0) {
  for (const child of children) if (child.exitCode === null) child.kill("SIGTERM");
  process.exit(code);
}
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));

const vite = start("pnpm", ["exec", "vite", "--port", port, "--strictPort"]);
vite.stdout.pipe(process.stdout);
vite.stderr.pipe(process.stderr);

const tunnel = start("cloudflared", ["tunnel", "--no-autoupdate", "--url", `http://localhost:${port}`]);
let shown = false;
const findUrl = (chunk) => {
  const match = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(chunk.toString());
  if (match && !shown) {
    shown = true;
    console.log(`\n[dev:phone] Open on your phone: ${match[0]}\n`);
  }
};
tunnel.stdout.on("data", findUrl);
tunnel.stderr.on("data", findUrl);
