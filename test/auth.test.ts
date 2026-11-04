import { env } from "cloudflare:test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sha256Hex } from "../src/worker/lib/crypto";
import { DAY, MINUTE } from "../src/worker/lib/time";
import { call, codeFromMail, login, mockResend, sessionCookie } from "./helpers";

const T0 = new Date("2026-11-04T08:00:00Z").getTime();

async function resetDb() {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions"),
    env.DB.prepare("DELETE FROM otp_codes"),
    env.DB.prepare("DELETE FROM otp_requests"),
    env.DB.prepare("DELETE FROM users"),
  ]);
}

beforeEach(async () => {
  await resetDb();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(T0);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

async function requestCode(email: string, lang: "vi" | "en" = "en") {
  const mock = mockResend();
  const res = await call("POST", "/api/auth/request", { body: { email, lang } });
  return { res, code: mock.sent.length ? codeFromMail(mock.sent.at(-1)) : null, mock };
}

describe("POST /api/auth/request", () => {
  it("sends a 6 digit code through Resend and stores only its hash", async () => {
    const { res, code, mock } = await requestCode("  Anh@Example.COM ", "vi");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(code).toMatch(/^\d{6}$/);
    const mail = mock.sent[0]!;
    expect(mail.to).toEqual(["anh@example.com"]);
    expect(mail.from).toBe("Bisou <no-reply@mail.yuchi-education.com>");
    expect(mail.subject).toContain("Mã đăng nhập");
    expect(mail.html).toContain(code);
    const auth = mock.spy.mock.calls[0]![1]!.headers as Record<string, string>;
    expect(auth.Authorization).toBe("Bearer re_test_placeholder");

    const row = await env.DB.prepare("SELECT * FROM otp_codes WHERE email = ?")
      .bind("anh@example.com")
      .first<{ code_hash: string; attempts: number; expires_at: number }>();
    expect(row).not.toBeNull();
    expect(row!.code_hash).not.toContain(code!);
    expect(row!.code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(row!.attempts).toBe(0);
    expect(row!.expires_at).toBe(T0 + 10 * MINUTE);
  });

  it("uses the English template when lang is en", async () => {
    const { mock } = await requestCode("en@example.com", "en");
    expect(mock.sent[0]!.subject).toContain("Your Bisou login code");
  });

  it("returns the same generic response for new and existing accounts", async () => {
    await login("known@example.com");
    vi.setSystemTime(T0 + 2 * MINUTE);
    const known = await requestCode("known@example.com");
    const unknown = await requestCode("nobody@example.com");
    expect(known.res.status).toBe(200);
    expect(unknown.res.status).toBe(200);
    expect(await known.res.text()).toBe(await unknown.res.text());
  });

  it("stays generic even when Resend fails", async () => {
    mockResend(500);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await call("POST", "/api/auth/request", { body: { email: "x@example.com" } });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects an invalid email", async () => {
    const mock = mockResend();
    const res = await call("POST", "/api/auth/request", { body: { email: "not-an-email" } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_email" });
    expect(mock.sent).toHaveLength(0);
  });

  it("allows one request per email per 60 seconds", async () => {
    await requestCode("rate@example.com");
    vi.setSystemTime(T0 + 30_000);
    const second = await requestCode("rate@example.com");
    expect(second.res.status).toBe(429);
    expect(await second.res.json()).toEqual({ error: "rate_limited", retryAfter: 30 });
    expect(second.mock.sent).toHaveLength(0);

    // Another address is not affected.
    expect((await requestCode("other@example.com")).res.status).toBe(200);

    vi.setSystemTime(T0 + 61_000);
    expect((await requestCode("rate@example.com")).res.status).toBe(200);
  });

  it("allows at most 5 requests per email per hour", async () => {
    for (let i = 0; i < 5; i++) {
      vi.setSystemTime(T0 + i * 2 * MINUTE);
      expect((await requestCode("hour@example.com")).res.status).toBe(200);
    }
    vi.setSystemTime(T0 + 12 * MINUTE);
    const sixth = await requestCode("hour@example.com");
    expect(sixth.res.status).toBe(429);
    const body = await sixth.res.json<{ error: string; retryAfter: number }>();
    expect(body.error).toBe("rate_limited");
    expect(body.retryAfter).toBe(48 * 60);

    vi.setSystemTime(T0 + 60 * MINUTE + 1000);
    expect((await requestCode("hour@example.com")).res.status).toBe(200);
  });

  it("logs the code instead of mailing when RESEND_API_KEY is missing, with a dev note only in development", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { default: worker } = await import("../src/worker/index");
    const ctx = { waitUntil: () => {}, passThroughOnException: () => {}, props: {} } as unknown as ExecutionContext;
    const send = (environment: string, email: string) =>
      worker.fetch(
        new Request("https://bisou.example/api/auth/request", {
          method: "POST",
          headers: { "Content-Type": "application/json", Origin: "https://bisou.example" },
          body: JSON.stringify({ email }),
        }) as Request<unknown, IncomingRequestCfProperties>,
        { ...env, RESEND_API_KEY: undefined, ENVIRONMENT: environment },
        ctx,
      );

    const dev = await send("development", "dev@example.com");
    expect(dev.status).toBe(200);
    const devBody = await dev.json<{ ok: boolean; devNote?: string }>();
    expect(devBody.devNote).toContain("RESEND_API_KEY");
    expect(log.mock.calls.flat().join(" ")).toMatch(/dev@example\.com: \d{6}/);

    const prod = await send("production", "prod@example.com");
    expect(await prod.json()).toEqual({ ok: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("POST /api/auth/verify", () => {
  it("logs in with the right code: creates the user, a session and a persistent cookie", async () => {
    const { code } = await requestCode("Love@Example.com", "en");
    const res = await call("POST", "/api/auth/verify", {
      body: { email: "love@example.com", code, lang: "en" },
    });
    expect(res.status).toBe(200);
    const { user } = await res.json<{ user: { id: string; email: string; displayName: null; locale: string } }>();
    expect(user.email).toBe("love@example.com");
    expect(user.displayName).toBeNull();
    expect(user.locale).toBe("en");
    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);

    // The code is single use.
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM otp_codes").first("n")).toBe(0);
    const again = await call("POST", "/api/auth/verify", { body: { email: "love@example.com", code } });
    expect(again.status).toBe(400);
    expect(await again.json()).toEqual({ error: "code_expired" });

    // Only the SHA-256 of the token is stored.
    const cookie = sessionCookie(res);
    const token = cookie.split("=")[1]!;
    expect(token.length).toBeGreaterThanOrEqual(43);
    const session = await env.DB.prepare("SELECT * FROM sessions").first<{
      token_hash: string;
      user_id: string;
      expires_at: number;
    }>();
    expect(session!.token_hash).toBe(await sha256Hex(token));
    expect(session!.user_id).toBe(user.id);
    expect(session!.expires_at).toBe(T0 + 90 * DAY);
  });

  it("sets the session cookie with HttpOnly, Secure, SameSite=Lax, Path=/ and a 90 day Max-Age", async () => {
    const { res } = await login("flags@example.com");
    const set = res.headers.get("Set-Cookie")!;
    expect(set).toMatch(/^bisou_session=[A-Za-z0-9_-]+;/);
    expect(set).toContain("HttpOnly");
    expect(set).toContain("Secure");
    expect(set).toContain("SameSite=Lax");
    expect(set).toContain("Path=/");
    expect(set).toContain(`Max-Age=${90 * 24 * 60 * 60}`);
    expect(set).toContain(`Expires=${new Date(T0 + 90 * DAY).toUTCString()}`);
  });

  it("reuses the existing user on a second login", async () => {
    const first = await login("same@example.com");
    const a = await first.res.json<{ user: { id: string } }>();
    vi.setSystemTime(T0 + 2 * MINUTE);
    const second = await login("same@example.com");
    const b = await second.res.json<{ user: { id: string } }>();
    expect(b.user.id).toBe(a.user.id);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first("n")).toBe(1);
  });

  it("rejects a wrong code and counts the attempts left", async () => {
    const { code } = await requestCode("wrong@example.com");
    const wrong = code === "000000" ? "111111" : "000000";
    const res = await call("POST", "/api/auth/verify", { body: { email: "wrong@example.com", code: wrong } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_code", attemptsLeft: 4 });
    expect(res.headers.get("Set-Cookie")).toBeNull();
  });

  it("kills the code after 5 wrong attempts, even for the right code", async () => {
    const { code } = await requestCode("lock@example.com");
    const wrong = code === "000000" ? "111111" : "000000";
    const results: unknown[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await call("POST", "/api/auth/verify", { body: { email: "lock@example.com", code: wrong } });
      results.push(await res.json());
    }
    expect(results.slice(0, 4)).toEqual([1, 2, 3, 4].map((n) => ({ error: "invalid_code", attemptsLeft: 5 - n })));
    expect(results[4]).toEqual({ error: "too_many_attempts" });

    const right = await call("POST", "/api/auth/verify", { body: { email: "lock@example.com", code } });
    expect(right.status).toBe(429);
    expect(await right.json()).toEqual({ error: "too_many_attempts" });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions").first("n")).toBe(0);
  });

  it("a new code after a lockout works again", async () => {
    const { code } = await requestCode("relock@example.com");
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) {
      await call("POST", "/api/auth/verify", { body: { email: "relock@example.com", code: wrong } });
    }
    vi.setSystemTime(T0 + 2 * MINUTE);
    const fresh = await requestCode("relock@example.com");
    const res = await call("POST", "/api/auth/verify", { body: { email: "relock@example.com", code: fresh.code } });
    expect(res.status).toBe(200);
  });

  it("rejects an expired code", async () => {
    const { code } = await requestCode("late@example.com");
    vi.setSystemTime(T0 + 10 * MINUTE + 1);
    const res = await call("POST", "/api/auth/verify", { body: { email: "late@example.com", code } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "code_expired" });
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM otp_codes").first("n")).toBe(0);
  });

  it("accepts a code just before expiry", async () => {
    const { code } = await requestCode("ontime@example.com");
    vi.setSystemTime(T0 + 10 * MINUTE - 1);
    const res = await call("POST", "/api/auth/verify", { body: { email: "ontime@example.com", code } });
    expect(res.status).toBe(200);
  });

  it("does not accept a code issued for another email", async () => {
    const { code } = await requestCode("a@example.com");
    await requestCode("b@example.com");
    const res = await call("POST", "/api/auth/verify", { body: { email: "b@example.com", code } });
    // Either the codes differ or the email bound HMAC rejects it; a collision of the two random codes is 1 in a million.
    expect(res.status).toBe(400);
  });

  it("rejects malformed codes without spending an attempt", async () => {
    await requestCode("fmt@example.com");
    const res = await call("POST", "/api/auth/verify", { body: { email: "fmt@example.com", code: "12ab" } });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_code" });
    expect(await env.DB.prepare("SELECT attempts FROM otp_codes").first("attempts")).toBe(0);
  });
});

describe("GET /api/me", () => {
  it("returns 401 without a cookie", async () => {
    const res = await call("GET", "/api/me");
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "unauthorized" });
  });

  it("returns 401 for an unknown token", async () => {
    const res = await call("GET", "/api/me", { cookie: "bisou_session=forged" });
    expect(res.status).toBe(401);
  });

  it("returns the user with a valid cookie", async () => {
    const { cookie } = await login("me@example.com");
    const res = await call("GET", "/api/me", { cookie });
    expect(res.status).toBe(200);
    const { user } = await res.json<{ user: { email: string } }>();
    expect(user.email).toBe("me@example.com");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("rejects an expired session", async () => {
    const { cookie } = await login("old@example.com");
    vi.setSystemTime(T0 + 90 * DAY + 1);
    const res = await call("GET", "/api/me", { cookie });
    expect(res.status).toBe(401);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions").first("n")).toBe(0);
  });
});

describe("sliding session expiry", () => {
  it("does not extend while more than 60 days remain", async () => {
    const { cookie } = await login("slide@example.com");
    vi.setSystemTime(T0 + 29 * DAY);
    const res = await call("GET", "/api/me", { cookie });
    expect(res.status).toBe(200);
    expect(res.headers.get("Set-Cookie")).toBeNull();
    expect(await env.DB.prepare("SELECT expires_at FROM sessions").first("expires_at")).toBe(T0 + 90 * DAY);
  });

  it("extends to 90 days and resends the cookie when less than 60 days remain", async () => {
    const { cookie } = await login("slide2@example.com");
    const later = T0 + 31 * DAY;
    vi.setSystemTime(later);
    const res = await call("GET", "/api/me", { cookie });
    expect(res.status).toBe(200);
    const set = res.headers.get("Set-Cookie")!;
    expect(set).toContain(cookie);
    expect(set).toContain(`Max-Age=${90 * 24 * 60 * 60}`);
    expect(await env.DB.prepare("SELECT expires_at FROM sessions").first("expires_at")).toBe(later + 90 * DAY);

    // Still valid past the original 90 days thanks to the extension.
    vi.setSystemTime(T0 + 100 * DAY);
    expect((await call("GET", "/api/me", { cookie })).status).toBe(200);
  });
});

describe("PATCH /api/me", () => {
  it("updates display name and locale", async () => {
    const { cookie } = await login("patch@example.com");
    const res = await call("PATCH", "/api/me", { cookie, body: { displayName: "  Mai  ", locale: "vi" } });
    expect(res.status).toBe(200);
    const { user } = await res.json<{ user: { displayName: string; locale: string } }>();
    expect(user.displayName).toBe("Mai");
    expect(user.locale).toBe("vi");

    const cleared = await call("PATCH", "/api/me", { cookie, body: { displayName: "" } });
    expect((await cleared.json<{ user: { displayName: null } }>()).user.displayName).toBeNull();
  });

  it("rejects invalid values", async () => {
    const { cookie } = await login("bad@example.com");
    expect((await call("PATCH", "/api/me", { cookie, body: { locale: "fr" } })).status).toBe(400);
    expect((await call("PATCH", "/api/me", { cookie, body: { displayName: "x".repeat(51) } })).status).toBe(400);
  });

  it("requires a session", async () => {
    expect((await call("PATCH", "/api/me", { body: { displayName: "x" } })).status).toBe(401);
  });
});

describe("POST /api/auth/logout", () => {
  it("deletes the session and clears the cookie", async () => {
    const { cookie } = await login("bye@example.com");
    const res = await call("POST", "/api/auth/logout", { cookie });
    expect(res.status).toBe(200);
    const set = res.headers.get("Set-Cookie")!;
    expect(set).toMatch(/bisou_session=;/);
    expect(set).toContain("Max-Age=0");
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions").first("n")).toBe(0);
    expect((await call("GET", "/api/me", { cookie })).status).toBe(401);
  });

  it("is harmless without a session", async () => {
    expect((await call("POST", "/api/auth/logout")).status).toBe(200);
  });
});

describe("CSRF origin guard", () => {
  it("rejects state-changing requests from another origin", async () => {
    const mock = mockResend();
    const res = await call("POST", "/api/auth/request", {
      body: { email: "csrf@example.com" },
      origin: "https://evil.example",
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "forbidden_origin" });
    expect(mock.sent).toHaveLength(0);
  });

  it("rejects state-changing requests without an Origin header", async () => {
    const { cookie } = await login("noorigin@example.com");
    const res = await call("POST", "/api/auth/logout", { cookie, origin: null });
    expect(res.status).toBe(403);
    expect(await env.DB.prepare("SELECT COUNT(*) AS n FROM sessions").first("n")).toBe(1);
    const patch = await call("PATCH", "/api/me", { cookie, body: { displayName: "x" }, origin: "null" });
    expect(patch.status).toBe(403);
  });

  it("lets GET through without an Origin header", async () => {
    const { cookie } = await login("get@example.com");
    expect((await call("GET", "/api/me", { cookie, origin: null })).status).toBe(200);
  });
});
