import type { Env } from "../env";
import { fromBase64Url, toBase64Url } from "./crypto";

const encoder = new TextEncoder();
export const MAX_PUSH_PLAINTEXT = 3993;

export function isPushEndpoint(value: string): boolean {
  if (value.length > 2048 || !/^https:\/\/[^/:@?#\\\s]+\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.port && !url.username && !url.password && !url.hash && (
      url.hostname === "fcm.googleapis.com" || url.hostname === "web.push.apple.com"
      || url.hostname.endsWith(".push.services.mozilla.com") || url.hostname.endsWith(".notify.windows.com")
    );
  } catch { return false; }
}

export function publicKeyFromJwk(jwk: JsonWebKey): string {
  return toBase64Url(new Uint8Array([4, ...fromBase64Url(jwk.x!), ...fromBase64Url(jwk.y!)]));
}

async function hkdf(input: Uint8Array, salt: Uint8Array, info: Uint8Array, bits: number) {
  const key = await crypto.subtle.importKey("raw", new Uint8Array(input), "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: new Uint8Array(salt), info: new Uint8Array(info) }, key, bits));
}

// https://www.rfc-editor.org/rfc/rfc8291#section-3.4
export async function encrypt(plaintext: Uint8Array, p256dh: string, auth: string, options: {
  salt?: Uint8Array<ArrayBuffer>; serverKeys?: CryptoKeyPair;
} = {}): Promise<Uint8Array<ArrayBuffer>> {
  if (plaintext.length > MAX_PUSH_PLAINTEXT) throw new Error("push payload too large");
  const salt = options.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const keys = options.serverKeys ?? await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]) as CryptoKeyPair;
  const serverPublic = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey) as ArrayBuffer);
  const uaPublic = fromBase64Url(p256dh);
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const agreement = { name: "ECDH", public: uaKey };
  const shared = new Uint8Array(await crypto.subtle.deriveBits(agreement, keys.privateKey, 256));
  const info = new Uint8Array([...encoder.encode("WebPush: info\0"), ...uaPublic, ...serverPublic]);
  const ikm = await hkdf(shared, fromBase64Url(auth), info, 256);
  const cek = await hkdf(ikm, salt, encoder.encode("Content-Encoding: aes128gcm\0"), 128);
  const nonce = await hkdf(ikm, salt, encoder.encode("Content-Encoding: nonce\0"), 96);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, new Uint8Array([...plaintext, 2])));
  return new Uint8Array([...salt, 0, 0, 16, 0, 65, ...serverPublic, ...ciphertext]);
}

export async function vapidHeader(endpoint: string, jwk: JsonWebKey, now: number): Promise<string> {
  const head = toBase64Url(encoder.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = toBase64Url(encoder.encode(JSON.stringify({
    aud: new URL(endpoint).origin, exp: Math.floor(now / 1000) + 12 * 3600,
    sub: "mailto:no-reply@mail.yuchi-education.com",
  })));
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, encoder.encode(`${head}.${body}`));
  return `vapid t=${head}.${body}.${toBase64Url(new Uint8Array(signature))}, k=${publicKeyFromJwk(jwk)}`;
}

export interface PushRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushMessage { title: string; url: string; tag: string }

export async function sendPush(env: Env, row: PushRow, message: PushMessage, options: {
  ttl: number; topic: "journal" | "events" | "garden" | "notes";
}): Promise<"sent" | "gone" | "failed"> {
  if (!env.VAPID_PRIVATE_KEY) return "failed";
  let status = 0;
  try {
    if (!isPushEndpoint(row.endpoint)) throw new Error("invalid push endpoint");
    const body = await encrypt(encoder.encode(JSON.stringify(message)), row.p256dh, row.auth);
    const response = await fetch(row.endpoint, {
      method: "POST", redirect: "manual", body,
      headers: {
        "Content-Type": "application/octet-stream", "Content-Encoding": "aes128gcm",
        TTL: String(options.ttl), Urgency: "normal", Topic: options.topic,
        Authorization: await vapidHeader(row.endpoint, JSON.parse(env.VAPID_PRIVATE_KEY), Date.now()),
      },
    });
    status = response.status;
    await response.body?.cancel();
  } catch { /* Fetch errors can contain the endpoint. A 3xx stays unfollowed and counts as a failure. */ }
  if (status >= 200 && status < 300) {
    await env.DB.prepare("UPDATE push_subscriptions SET last_success_at = ?, failures = 0 WHERE id = ?")
      .bind(Date.now(), row.id).run();
    return "sent";
  }
  if ([401, 403, 404, 410].includes(status)) {
    await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(row.id).run();
    return "gone";
  }
  await env.DB.prepare("UPDATE push_subscriptions SET failures = failures + 1 WHERE id = ?").bind(row.id).run();
  console.error("[bisou] push failed", options.topic, status);
  return "failed";
}
