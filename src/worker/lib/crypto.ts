// Web Crypto helpers only: Workers free plan has a 10 ms CPU budget, so no bcrypt/scrypt.

const encoder = new TextEncoder();

export function toHex(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = "";
  for (const b of view) out += b.toString(16).padStart(2, "0");
  return out;
}

export function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) throw new Error("invalid base64url");
  return Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
}

/** Uniform 6 digit code (rejection sampling avoids modulo bias). */
export function generateOtpCode(): string {
  const limit = Math.floor(0x100000000 / 1_000_000) * 1_000_000;
  const buf = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(buf);
    const n = buf[0]!;
    if (n < limit) return (n % 1_000_000).toString().padStart(6, "0");
  }
}

async function hmacKey(pepper: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(pepper), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

/** HMAC-SHA256 of the code, bound to the email so a hash cannot be reused for another address. */
export async function hashOtp(pepper: string, email: string, code: string): Promise<string> {
  const key = await hmacKey(pepper);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${email}:${code}`));
  return toHex(sig);
}

/** Constant-time check: crypto.subtle.verify compares the HMAC without early exit. */
export async function verifyOtp(pepper: string, email: string, code: string, storedHex: string): Promise<boolean> {
  const expected = fromHex(storedHex);
  if (!expected) return false;
  const key = await hmacKey(pepper);
  return crypto.subtle.verify("HMAC", key, expected, encoder.encode(`${email}:${code}`));
}

export function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function sha256Hex(value: string): Promise<string> {
  return toHex(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}
