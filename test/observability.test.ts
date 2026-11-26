import { env } from "cloudflare:workers";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import worker from "../src/worker/index";
import { jsonLogLines, ORIGIN, paired, resetDb, testContext } from "./helpers";
import { device } from "./push-helpers";

describe("API error logs", () => {
  beforeEach(resetDb);
  afterEach(() => vi.restoreAllMocks());

  it("logs one structured error for a throwing route without disclosing request or error details", async () => {
    const { a, couple } = await paired();
    const sensitive = [
      a.email,
      a.id,
      couple.id,
      a.cookie,
      "123456",
      "https://fcm.googleapis.com/message?token=endpointToken",
      "privateJournalText",
      "privateTitle",
      "p256dhKey",
      "authKey",
      "192.0.2.1",
      "authorizationToken",
      "privateBody",
      "privatePath",
      "    at forgedFrame (private.js:1:2)",
    ];
    const prepare = env.DB.prepare.bind(env.DB);
    vi.spyOn(env.DB, "prepare").mockImplementation((sql) => {
      if (sql.includes("FROM journal_entries")) throw new Error(sensitive.join("\n"));
      return prepare(sql);
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const ray = "a2c4e6f8a2c4e6f8-SGN";
    const response = await worker.fetch(
      new Request(`${ORIGIN}/api/journal/privatePath?title=privateTitle`, {
        headers: {
          "cf-ray": ray,
          "cf-connecting-ip": "192.0.2.1",
          Cookie: a.cookie,
          Authorization: "Bearer authorizationToken",
        },
      }) as Request<unknown, IncomingRequestCfProperties>,
      env,
      testContext,
    );
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "server_error" });
    expect(error).toHaveBeenCalledTimes(1);
    const [line] = jsonLogLines(error.mock.calls);
    expect(line).toMatchObject({
      event: "api_error",
      level: "error",
      requestId: ray,
      route: "/api/journal/:id",
      method: "GET",
      status: 500,
      durationMs: expect.any(Number),
      release: "dev",
      errorCode: "server_error",
      errorMessage: "[redacted]",
      stack: expect.stringMatching(/^\[redacted\]\n\s+at .+?:\d+:\d+/),
    });
    for (const value of sensitive) expect(JSON.stringify(line)).not.toContain(value);
  });

  it("logs a returned 503 once and skips request logs for other responses", async () => {
    const {
      a: { cookie },
    } = await paired();
    const subscription = await device("observer");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const request = (path: string, method = "GET", body?: unknown) =>
      worker.fetch(
        new Request(ORIGIN + path, {
          method,
          headers: { Cookie: cookie, Origin: ORIGIN, "cf-ray": "privateRayToken", "Content-Type": "application/json" },
          body: body === undefined ? undefined : JSON.stringify(body),
        }) as Request<unknown, IncomingRequestCfProperties>,
        { ...env, VAPID_PRIVATE_KEY: undefined },
        testContext,
      );

    expect((await request("/api/me")).status).toBe(200);
    expect((await request("/api/missing")).status).toBe(404);
    const unavailable = await request("/api/push/subscription", "PUT", subscription.body);
    expect(unavailable.status).toBe(503);
    expect(await unavailable.json()).toEqual({ error: "push_unavailable" });
    expect(error).toHaveBeenCalledTimes(1);
    const [line] = jsonLogLines(error.mock.calls);
    expect(line).toMatchObject({
      event: "api_error",
      level: "error",
      requestId: null,
      route: "/api/push/subscription",
      method: "PUT",
      status: 503,
      errorCode: "http_5xx",
    });
    expect(JSON.stringify(line)).not.toContain("privateRayToken");
    expect(line).not.toHaveProperty("stack");
    expect(warn).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });
});
