import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/worker/index";
import { jsonLogLines, resetDb } from "./helpers";

const notesUrl = "https://hc-ping.com/test-project/test-notes";

function scheduled(at: string, secret?: string) {
  const pending: Promise<unknown>[] = [];
  const ctx = {
    waitUntil: (promise: Promise<unknown>) => pending.push(promise),
    passThroughOnException: () => {},
    props: {},
  } as unknown as ExecutionContext;
  worker.scheduled(
    { scheduledTime: Date.parse(`2026-11-26T${at}:00+07:00`), cron: "* * * * *", noRetry: () => {} },
    { ...env, HEALTHCHECKS_URLS: secret },
    ctx,
  );
  return Promise.all(pending);
}

describe("scheduled Worker heartbeats", () => {
  beforeEach(resetDb);
  afterEach(() => vi.restoreAllMocks());

  it.each([
    ["03:01", "notes"],
    ["07:00", "07"],
    ["08:00", "08"],
    ["20:00", "20"],
    ["03:00", "03"],
  ])("reports and pings the slots due at %s Vietnam time", async (at, slot) => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const url = `https://hc-ping.com/test-project/test-${slot}`;
    const completedSlots: unknown[][] = [];
    const requests: Request[] = [];
    const ping = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      requests.push(new Request(input, init));
      completedSlots.push(
        jsonLogLines(log.mock.calls)
          .filter((entry) => entry.event === "cron_run")
          .map((entry) => entry.slot),
      );
      return new Response(null, { status: 204 });
    });
    await scheduled(at, JSON.stringify({ notes: notesUrl, [slot]: url }));
    const events = jsonLogLines(log.mock.calls).filter((line) => line.event === "cron_run");
    const slots = slot === "notes" ? ["notes"] : ["notes", slot];
    expect(events.map((entry) => entry.slot).sort()).toEqual(slots.sort());
    const ids = new Set(events.map((entry) => entry.requestId));
    expect(ids.size).toBe(1);
    for (const entry of events) {
      expect(entry).toMatchObject({
        event: "cron_run",
        level: "info",
        outcome: "success",
        durationMs: expect.any(Number),
        requestId: expect.stringMatching(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/),
        release: "dev",
      });
      expect(entry.durationMs).toBeGreaterThanOrEqual(0);
      expect(JSON.stringify(entry)).not.toContain("test-project");
    }
    expect(ping).toHaveBeenCalledTimes(slots.length);
    expect(requests.map((request) => request.url).sort()).toEqual(
      (slot === "notes" ? [notesUrl] : [notesUrl, url]).sort(),
    );
    for (const [index, request] of requests.entries()) {
      expect(request.method).toBe("GET");
      expect(request.body).toBeNull();
      expect([...request.headers]).toEqual([]);
      expect(completedSlots[index]).toContain(request.url === notesUrl ? "notes" : slot);
    }
  });

  it.each([
    ["09:01", "notes", "UPDATE notes SET sent_at"],
    ["07:00", "07", "UPDATE notes SET reminded_at"],
    ["08:00", "08", "SELECT s.user_id, u.locale FROM push_subscriptions"],
    ["20:00", "20", "SELECT s.user_id, u.locale FROM push_subscriptions"],
    ["03:00", "03", "DELETE FROM otp_codes"],
    ["03:00", "03", "UPDATE photos SET created_at = 0"],
  ])("reports a failed %s job (%s) and pings its fail URL", async (at, slot, statement) => {
    const prepare = env.DB.prepare.bind(env.DB);
    const url = `https://hchk.io/test-project/slot-${slot}`;
    const details = `private@example.com 123456 bisou_session=privateCookie ${url}`;
    vi.spyOn(env.DB, "prepare").mockImplementation((sql) => {
      if (sql.startsWith(statement)) throw new Error(details);
      return prepare(sql);
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const ping = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await scheduled(at, JSON.stringify({ [slot]: `${url}/` }));
    const events = jsonLogLines(error.mock.calls).filter((entry) => entry.event === "cron_run");
    expect(events).toMatchObject([{ slot, level: "error", outcome: "failure", durationMs: expect.any(Number) }]);
    for (const value of details.split(" ")) expect(JSON.stringify(error.mock.calls)).not.toContain(value);
    expect(ping).toHaveBeenCalledTimes(1);
    const [input, init] = ping.mock.calls[0]!;
    const request = new Request(input, init);
    expect(request.url).toBe(`${url}/fail`);
    expect(request.body).toBeNull();
    expect([...request.headers]).toEqual([]);
  });

  it.each(
    [
      undefined,
      "",
      "{",
      "null",
      JSON.stringify({ "07": notesUrl }),
      JSON.stringify({ notes: 123456 }),
      JSON.stringify({ notes: "not a URL" }),
      JSON.stringify({ notes: "http://hc-ping.com/test-notes" }),
      JSON.stringify({ notes: "https://hc-ping.com.example.com/test-notes" }),
      JSON.stringify({ notes: `${notesUrl}?key=private` }),
    ].map((secret, index) => ({ secret, index })),
  )("skips invalid or absent heartbeat configuration ($index)", async ({ secret }) => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ping = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
    await scheduled("09:01", secret);
    expect(jsonLogLines(log.mock.calls)).toMatchObject([{ event: "cron_run", slot: "notes", outcome: "success" }]);
    expect(ping).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it.each([200, 503])("cancels the ping response body on status %s", async (status) => {
    const cancel = vi.fn();
    const body = new ReadableStream({ cancel });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, { status }));
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});

    await scheduled("09:01", JSON.stringify({ notes: notesUrl }));

    expect(cancel).toHaveBeenCalledTimes(1);
  });

  it.each([503, "rejection"])("keeps the successful outcome when the ping fails (%s)", async (failure) => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const ping = vi.spyOn(globalThis, "fetch");
    if (typeof failure === "number") ping.mockResolvedValue(new Response("private@example.com", { status: failure }));
    else ping.mockRejectedValue(new Error(`private@example.com ${notesUrl}`));
    await scheduled("09:01", JSON.stringify({ notes: notesUrl }));
    const [run] = jsonLogLines(log.mock.calls);
    expect(run).toMatchObject({ event: "cron_run", slot: "notes", outcome: "success" });
    expect(jsonLogLines(warn.mock.calls)).toMatchObject([
      {
        event: "heartbeat_failed",
        level: "warn",
        slot: "notes",
        outcome: "success",
        status: typeof failure === "number" ? failure : null,
        requestId: run?.requestId,
      },
    ]);
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/private@example\.com|test-project/);
  });
});
