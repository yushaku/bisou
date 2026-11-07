import { env } from "cloudflare:test";
import { expect, vi } from "vitest";
import type { Couple } from "../src/shared/types";
import worker from "../src/worker/index";

export const ORIGIN = "https://bisou.example";

const background: Promise<unknown>[] = [];
export const testContext = {
  waitUntil: (promise: Promise<unknown>) => { background.push(promise); },
  passThroughOnException: () => {}, props: {},
} as unknown as ExecutionContext;
export async function waitForBackground() {
  await Promise.all(background.splice(0));
}

export async function explain(sql: string, ...binds: unknown[]): Promise<string[]> {
  const { results } = await env.DB.prepare(`EXPLAIN QUERY PLAN ${sql}`).bind(...binds).all<{ detail: string }>();
  return results.map((row) => row.detail);
}

export async function resetDb() {
  await waitForBackground();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM push_subscriptions"),
    env.DB.prepare("DELETE FROM photos"),
    env.DB.prepare("DELETE FROM wish_spins"),
    env.DB.prepare("DELETE FROM wish_claims"),
    env.DB.prepare("DELETE FROM wishes"),
    env.DB.prepare("DELETE FROM journal_entries"),
    env.DB.prepare("DELETE FROM join_attempts"),
    env.DB.prepare("DELETE FROM pair_codes"),
    env.DB.prepare("DELETE FROM couple_members"),
    env.DB.prepare("DELETE FROM couple_events"),
    env.DB.prepare("DELETE FROM couples"),
    env.DB.prepare("DELETE FROM sessions"),
    env.DB.prepare("DELETE FROM otp_codes"),
    env.DB.prepare("DELETE FROM otp_requests"),
    env.DB.prepare("DELETE FROM users"),
  ]);
}

export interface SentMail {
  to: string[];
  subject: string;
  text: string;
  html: string;
  from: string;
}

/** Replaces the Resend call with a mock that records every mail. */
export function mockResend(status = 200) {
  const sent: SentMail[] = [];
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    if (url !== "https://api.resend.com/emails") throw new Error(`unexpected fetch ${url}`);
    sent.push(JSON.parse(String(init?.body)) as SentMail);
    return new Response(JSON.stringify({ id: "mock" }), { status });
  });
  return { sent, spy };
}

export async function call(
  method: string,
  path: string,
  opts: { body?: unknown; form?: FormData; cookie?: string; origin?: string | null } = {},
): Promise<Response> {
  const headers = new Headers();
  if (!opts.form && opts.body !== undefined) headers.set("Content-Type", "application/json");
  if (opts.cookie) headers.set("Cookie", opts.cookie);
  const origin = opts.origin === undefined ? ORIGIN : opts.origin;
  if (origin) headers.set("Origin", origin);
  const req = new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: opts.form ?? (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
  });
  return worker.fetch(req as Request<unknown, IncomingRequestCfProperties>, env, testContext);
}

export function codeFromMail(mail: SentMail | undefined): string {
  const match = mail?.text.match(/\b(\d{6})\b/);
  if (!match?.[1]) throw new Error("no code in mail");
  return match[1];
}

/** Extracts "bisou_session=<value>" from a Set-Cookie header, for the Cookie header of later calls. */
export function sessionCookie(res: Response): string {
  const set = res.headers.get("Set-Cookie") ?? "";
  const match = set.match(/bisou_session=([^;]*)/);
  if (!match?.[1]) throw new Error(`no session cookie in: ${set}`);
  return `bisou_session=${match[1]}`;
}

export async function login(email: string): Promise<{ cookie: string; res: Response }> {
  const { sent, spy } = mockResend();
  await call("POST", "/api/auth/request", { body: { email, lang: "en" } });
  const code = codeFromMail(sent.at(-1));
  spy.mockRestore();
  const res = await call("POST", "/api/auth/verify", { body: { email, code } });
  return { cookie: sessionCookie(res), res };
}

export interface TestUser {
  cookie: string;
  id: string;
}

export async function user(name: string): Promise<TestUser> {
  const { cookie, res } = await login(`${name.toLowerCase()}@example.com`);
  const { user: u } = await res.json<{ user: { id: string } }>();
  await call("PATCH", "/api/me", { cookie, body: { displayName: name } });
  return { cookie, id: u.id };
}

export async function paired(): Promise<{ a: TestUser; b: TestUser; couple: Couple; code: string }> {
  const a = await user("An");
  const b = await user("Minh");
  const created = await call("POST", "/api/couple", { cookie: a.cookie });
  expect(created.status).toBe(201);
  const code = (await created.json<{ couple: Couple }>()).couple.pendingCode!.code;
  const res = await call("POST", "/api/couple/join", { cookie: b.cookie, body: { code } });
  expect(res.status).toBe(200);
  return { a, b, couple: (await res.json<{ couple: Couple }>()).couple, code };
}

// Header-only fixtures for server validation, not decodable pixel data.
export function jpeg({ width, height, exif = false }: { width: number; height: number; exif?: boolean }) {
  return new Uint8Array([
    0xff, 0xd8,
    ...(exif ? [0xff, 0xe1, 0, 8, 69, 120, 105, 102, 0, 0] : []),
    0xff, 0xc0, 0, 11, 8, height >> 8, height & 255, width >> 8, width & 255, 1, 1, 0x11, 0,
    0xff, 0xda, 0, 8, 1, 1, 0, 0, 63, 0,
    0xff, 0xd9,
  ]);
}

export function webp({ width, height, kind, exif = false }: {
  width: number;
  height: number;
  kind: "VP8" | "VP8L" | "VP8X";
  exif?: boolean;
}) {
  const header = new Uint8Array(kind === "VP8L" ? 5 : 10);
  const dimensions = new DataView(header.buffer);
  if (kind === "VP8") {
    header.set([0x10, 0, 0, 0x9d, 1, 0x2a]);
    dimensions.setUint16(6, width, true);
    dimensions.setUint16(8, height, true);
  } else if (kind === "VP8L") {
    header[0] = 0x2f;
    dimensions.setUint32(1, (width - 1) | ((height - 1) << 14), true);
  } else {
    header[0] = exif ? 0x08 : 0;
    header.set([
      (width - 1) & 255, ((width - 1) >> 8) & 255, ((width - 1) >> 16) & 255,
      (height - 1) & 255, ((height - 1) >> 8) & 255, ((height - 1) >> 16) & 255,
    ], 4);
  }
  const chunkEnd = 20 + header.length + header.length % 2;
  const bytes = new Uint8Array(chunkEnd + (exif ? 14 : 0));
  const view = new DataView(bytes.buffer);
  const encoder = new TextEncoder();
  bytes.set(encoder.encode("RIFF"));
  view.setUint32(4, bytes.length - 8, true);
  bytes.set(encoder.encode(`WEBP${kind.padEnd(4)}`), 8);
  view.setUint32(16, header.length, true);
  bytes.set(header, 20);
  if (exif) {
    bytes.set(encoder.encode("EXIF"), chunkEnd);
    view.setUint32(chunkEnd + 4, 6, true);
    bytes.set([69, 120, 105, 102, 0, 0], chunkEnd + 8);
  }
  return bytes;
}

export function photoForm(
  full: Uint8Array<ArrayBuffer>,
  thumb: Uint8Array<ArrayBuffer>,
  types: { full?: string; thumb?: string } = {},
): FormData {
  const form = new FormData();
  form.set("full", new File([full], "full", { type: types.full ?? "image/jpeg" }));
  form.set("thumb", new File([thumb], "thumb", { type: types.thumb ?? "image/jpeg" }));
  return form;
}

export async function upload(who: TestUser, form = photoForm(
  jpeg({ width: 1440, height: 1440 }), jpeg({ width: 480, height: 480 }),
)): Promise<string> {
  const res = await call("POST", "/api/photos", { cookie: who.cookie, form });
  expect(res.status).toBe(201);
  return (await res.json<{ photo: { id: string } }>()).photo.id;
}
