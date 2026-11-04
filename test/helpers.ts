import { env } from "cloudflare:test";
import { vi } from "vitest";
import worker from "../src/worker/index";

export const ORIGIN = "https://bisou.example";

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
  opts: { body?: unknown; cookie?: string; origin?: string | null } = {},
): Promise<Response> {
  const headers = new Headers();
  if (opts.body !== undefined) headers.set("Content-Type", "application/json");
  if (opts.cookie) headers.set("Cookie", opts.cookie);
  const origin = opts.origin === undefined ? ORIGIN : opts.origin;
  if (origin) headers.set("Origin", origin);
  const req = new Request(`${ORIGIN}${path}`, {
    method,
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
  });
  const ctx = { waitUntil: () => {}, passThroughOnException: () => {}, props: {} } as unknown as ExecutionContext;
  return worker.fetch(req as Request<unknown, IncomingRequestCfProperties>, env, ctx);
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
