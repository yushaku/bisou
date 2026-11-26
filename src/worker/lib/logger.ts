import { AsyncLocalStorage } from "node:async_hooks";
import type { CleanupCounts } from "./cleanup";
import type { CronSlot } from "./cron";
import type { PushTopic } from "./webpush";

declare const __BISOU_RELEASE__: string;
const release = typeof __BISOU_RELEASE__ === "undefined" ? "dev" : __BISOU_RELEASE__;
const rayId = /^[\da-f]{16}(?:-[A-Z]{3})?$/i;
const httpMethods = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
const pushTopics = new Set<PushTopic>(["journal", "events", "garden", "notes", "shared-wish"]);

interface LogContext {
  requestId?: string;
  route?: string;
  method?: string;
}

const context = new AsyncLocalStorage<LogContext>();

export function withLogContext<T>(fields: LogContext, run: () => T): T {
  return context.run(fields, run);
}

interface LogFields {
  status?: number;
  durationMs?: number;
  errorCode?: string;
  error?: unknown;
  devOtp?: { email: string; code: string };
  topic?: PushTopic;
  slot?: CronSlot;
  outcome?: "success" | "failure";
  count?: number;
  cleanup?: CleanupCounts;
  topicCounts?: ReadonlyMap<PushTopic, number>;
  batchSize?: number;
  lagP95Ms?: number | null;
  sent?: number;
  gone?: number;
  retried?: number;
  dropped?: number;
  failed?: number;
}

// Only fixed application messages are safe. Unknown messages can contain arbitrary user text.
const safeErrorMessages = new Set([
  "OTP_PEPPER is not configured",
  "avatar owner or reservation missing",
  "user row missing after insert",
  "join attempt reservation failed",
]);

function scrubErrorMessage(error: unknown): string | undefined {
  if (error === undefined) return undefined;
  const message = error instanceof Error ? error.message : undefined;
  return message && safeErrorMessages.has(message) ? message : "[redacted]";
}

function scrubStack(error: unknown, message: string | undefined): string | undefined {
  if (!(error instanceof Error) || !error.stack || message === undefined) return undefined;
  // Skip the whole error header. A multiline message can contain lines that look like frames.
  const header = `${Error.prototype.toString.call(error)}\n`;
  if (!error.stack.startsWith(header)) return undefined;
  const frames = error.stack
    .slice(header.length)
    .split("\n")
    .filter((line) => /^[ \t]+at [^?#]+:\d+:\d+\)?$/.test(line));
  return frames.length ? [message, ...frames].join("\n") : undefined;
}

export function log(level: "info" | "warn" | "error", event: string, fields: LogFields = {}): void {
  const { requestId, route, method } = context.getStore() ?? {};
  const { cleanup, error, devOtp } = fields;
  const errorMessage = scrubErrorMessage(error);
  const fieldsWithOptionalValues = {
    event,
    level,
    requestId: requestId && (method === undefined || rayId.test(requestId)) ? requestId : null,
    route: route ?? null,
    method: method && httpMethods.has(method) ? method : null,
    status: fields.status ?? null,
    durationMs: fields.durationMs ?? null,
    release,
    errorCode: fields.errorCode ?? null,
    errorMessage,
    stack: scrubStack(error, errorMessage),
    email: devOtp?.email,
    code: devOtp?.code,
    topic: fields.topic && pushTopics.has(fields.topic) ? fields.topic : undefined,
    slot: fields.slot,
    outcome: fields.outcome,
    count: fields.count,
    counts: cleanup && {
      otp_codes: cleanup.otp_codes,
      sessions: cleanup.sessions,
      otp_requests: cleanup.otp_requests,
      join_attempts: cleanup.join_attempts,
      pair_codes: cleanup.pair_codes,
      wish_spins: cleanup.wish_spins,
      wish_notices: cleanup.wish_notices,
    },
    topicCounts:
      fields.topicCounts && Object.fromEntries([...fields.topicCounts].filter(([topic]) => pushTopics.has(topic))),
    batchSize: fields.batchSize,
    lagP95Ms: fields.lagP95Ms,
    sent: fields.sent,
    gone: fields.gone,
    retried: fields.retried,
    dropped: fields.dropped,
    failed: fields.failed,
  };
  const entry = Object.fromEntries(Object.entries(fieldsWithOptionalValues).filter(([, value]) => value !== undefined));
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.log(entry);
}
